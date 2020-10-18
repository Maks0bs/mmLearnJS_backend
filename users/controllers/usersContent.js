let { Course } = require('../../courses/model')
let User = require('../model');
let { v1: uuidv1 } = require('uuid');
let { ObjectId } = require('mongoose').Types;
const {handleError, sendEmail} = require("../../helpers");
let { CONTACT_EMAIL } = require('../../constants').errors

/**
 * @type function
 * @throws 400, 404
 * @description adds the notifications, specified in the `req.notificationsToAdd.data` array to
 * the user with the id which is equal to `req.notificationsToAdd.user`
 * @param {e.Request} req
 * @param {models.User} req.auth
 * @param {Object} req.query
 * @param {string} req.query.dateTo
 * @param {string} req.query.dateFrom
 * @param {number} req.query.starting
 * @param {string} req.query.cnt
 * @param {string[]} req.query.courseIds
 * @param {e.Response} res
 * @memberOf controllers.users.usersData
 */
const getUpdatesByDate = (req, res) => {
    let { courses: courseIds, dateTo, dateFrom, starting, cnt } = req.query;
    return Course.find({_id: {$in: courseIds}})
        .then((courses) => {
            cnt = parseInt(cnt);
            starting = parseInt(starting);
            if (!courses || !courses.length) {
                return res.json([]);
            }
            //remove courses the current authenticated user is not subscribed to
            courses = courses.filter(c => !!c.subscribers.find(s => s.equals(req.auth._id)));
            let from = new Date(dateFrom), to = new Date(dateTo), preUpdates = [];
            to.setDate(to.getDate() + 1);
            courses.forEach(c => preUpdates.push(...c.updates
                .filter(u => (u.created >= from && u.created <= to) )
                .map(u => ({data: u, course: {name: c.name, id: c._id} }))
            ));
            let updates = preUpdates
                .sort((a, b) => (b.data.created - a.data.created))
                .filter((e, i) => ( i >= starting && i < (starting + cnt)))
            return res.json(updates);
        })
        .catch(err => handleError(err, res));
}
exports.getUpdatesByDate = getUpdatesByDate;

/**
 * @type function
 * @throws 400
 * @description adds the notifications, specified in the `req.notificationsToAdd.data` array to
 * the user with the id which is equal to `req.notificationsToAdd.user`
 * @param {e.Request} req
 * @param {{data: UserNotification[], user: ObjectId|string}[]} req.notificationsToAdd
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.usersData
 */
const addNotifications = (req, res, next) => {
    let notifications = req.notificationsToAdd.data;
    let user = req.notificationsToAdd.user;
    return User.findByIdAndUpdate(
        user,
        {$push: {notifications: {$each: notifications}}},
        { new: true }
    )
        .then(() => {
            return next();
        })
        .catch(err => handleError(err, res))
}
exports.addNotifications = addNotifications;

/**
 * @type function
 * @description removes all references to the user that is going to be deleted
 * (primarily in courses the user is somehow related to)
 * @param {e.Request} req
 * @param {models.User} [req.user]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.usersData
 */
const removeUserMentions = (req, res, next) => {
    let user = req.user;
    req.filesToDelete = user.photo ? [user.photo] : [];

    let teacherCourses = Array.isArray(user.teacherCourses) ? user.teacherCourses : [];
    // search occurrences of the deleted user in all courses they are related to
    return Course.find({
        _id: {
            $in: [...user.enrolledCourses, ...teacherCourses, ...user.subscribedCourses]
        }
    })
        .then((courses) => {
            let promises = [];
            for (let c of courses){
                // define a new creator for courses, in which the user to be deleted was the creator
                if (user._id.equals(c.creator)){
                    // if no new creator was found, then we leave the creator field to
                    // later detect a course with deleted creator to clean it up or do smth else
                    c.creator = c.teachers.find(t => !t.equals(user._id));
                }
                // remove from course subscribers
                let index = c.subscribers.findIndex(s => s.equals(user._id));
                if (index >= 0) c.subscribers.splice(index, 1);
                // remove from course students
                index = c.students.findIndex(s => s.equals(user._id));
                if (index >= 0) c.students.splice(index, 1);
                // remove from course teachers
                index = c.teachers.findIndex(t => t.equals(user._id));
                if (index >= 0) c.teachers.splice(index, 1);

                if (c.creator){
                    // everything is ok
                    promises.push(c.save());
                } else {
                    // no replacement for only teacher who is
                    // the creator of the course at the same time
                    // create a backup admin to be the spare creator for the course
                    let adminPassword = uuidv1(), adminEmail = `${uuidv1()}.admin@m.com`;
                    let newAdmin = new User({
                        name: 'admin', email: adminEmail,
                        password: adminPassword,
                        role: 'admin'
                    })
                    promises.push(
                        new Promise((resolve, reject) => {
                            return newAdmin.save()
                                .then(admin => {
                                    c.creator = admin;
                                    c.teachers = [admin];
                                    return sendEmail({
                                        from: "noreply@mmlearnjs.com",
                                        to: CONTACT_EMAIL,
                                        subject: "Creator of course deleted",
                                        text: `
												The creator of the course ${c.name} with
												id ${c._id} has been deleted and no teacher
												to replace the creator was found.
												The creator of the course was replaced
												with a newly generated admin account with
												following credentials:
												Email: ${adminEmail},
												Password: ${adminPassword}.
												Resolve this issue by
												contacting any potential teachers
												or deleting the course
											`
                                    })
                                })
                                .then(() => c.save())
                                .then(() => resolve(newAdmin))
                                .catch(err => reject(err))
                        })
                    )
                }
            }
            return Promise.all(promises);
        })
        .then(() => next())
        .catch(err => {handleError(err, res)})
}
exports.removeUserMentions = removeUserMentions;

// -----------------------------------------------------------------------
// this lower part is still not finished or not implemented.
// The endpoints there don't work
//

exports.configUsersFilter = (req, res, next) => {
    req.usersFilter = req.query;
    return next();
}
// TODO maybe move this to ./usersData
//TODO if we find users by a certain param and
// this param is in the hiddenFields array, don't include this users
//TODO however still include, if they could be found by another param, which is not hidden
exports.getUsersFiltered = (req, res) => {
    return res.json([]);
    let { usersFilter: filter } = req;
    return User.find({filter})
        .then((users) => (
            res.json(users)
        ))
        .catch(err => handleError(err, res))
}