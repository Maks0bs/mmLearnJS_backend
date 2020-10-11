let { Course } = require('../../courses/model')
let User = require('../model');
let { extend } = require('lodash');
let { v1: uuidv1 } = require('uuid');
let { ObjectId } = require('mongoose').Types;
const {handleError, sendEmail} = require("../../helpers");
let { CONTACT_EMAIL } = require('../../constants').errors
const CONSTANTS = {
	NON_UPDATABLE_USER_FIELDS: [
		'email', 'hashed_password', 'created', 'updated', 'salt', 'role', 'activated',
		'enrolledCourses', 'teacherCourses', 'subscribedCourses', 'notifications'
	],
	NON_AVAILABLE_USER_FIELDS: [
		'salt', 'hashed_password', 'notifications', 'subscribedCourses'
	]
}
exports.CONSTANTS = CONSTANTS;
/**
 * @class controllers.users.usersData
 */
/**
 * @type function
 * @throws 400, 404
 * @description works with the `:userId` param in the url. Adds all the user's data
 * whose Id is the provided parameter. Adds all user's data to the request object
 * under the `req.user` property
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {models.User} [req.user]
 * @param {e.Response} res
 * @param {function} next
 * @param {string} id - the id of the user that should be found and saved
 * @memberOf controllers.users.usersData
 */
const userById = (req, res, next, id) => {
	return User.findOne({_id: id})
		.populate('enrolledCourses', '_id name')
		.populate('teacherCourses', '_id name')
		.then(user => {
			if (!user) throw {
				status: 404, message: 'user with given ID not found'
			}
			req.user = user;
			return next();
		})
		.catch(err => handleError(err, res))
}
exports.userById = userById;

/**
 * @type function
 * @throws 404
 * @description returns the formatted user from the `req.user` object. Normally
 * works with the {@link controllers.users.usersData.userById userById} controller
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {models.User} [req.user]
 * @param {e.Response} res
 * @memberOf controllers.users.usersData
 */
const getUser = (req, res) => {
	if (!req.user){
		return res.status(404).json({
			error: { status: 404, message: 'user not found' }
		})
	}
	let user = req.user;
	// remove irrelevant data for the response
	for (let f of CONSTANTS.NON_AVAILABLE_USER_FIELDS){
		user[f] = undefined;
		delete user[f];
	}

	// if the wanted user is not the authenticated one, hide fields, which
	// the user we are looking for decided to hide from the public
	if (!req.auth || !user._id.equals(req.auth._id)){
		user.hideFields();
	}
	return res.json(user);
}
exports.getUser = getUser;

/**
 * @type function
 * @description extracts the new user data (that should be replaced instead of the old one)
 * from `req.body`. This middleware should only be invoked after the FormData-body has been
 * turned into an object, the fields of which are still stringified (normally after calling)
 * the {@link controllers.files.uploadFiles uploadFiles} controller
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {[]} [req.files]
 * @param {[]} [req.filesToDelete]
 * @param {models.User} [req.user]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.usersData
 */
const deserializeAndCleanUserData = (req, res, next) => {
	req.body = JSON.parse(req.body.user);//deserialize

	// Removing previous users avatar if new one gets uploaded
	// or user wants to explicitly delete their photo
	let filesToDelete = [];
	if (Array.isArray(req.files) && req.user.photo  &&
		( ( req.files[0] && req.body.photo === 'new') || (req.body.photo === null) )
	){
		filesToDelete.push(req.user.photo);
	}
	req.filesToDelete = filesToDelete;
	return next();
}
exports.deserializeAndCleanUserData = deserializeAndCleanUserData;

/**
 * @type function
 * @description updates the user, provided in the `req.user` object with the new data from the
 * request body. If the body was FormData, then this controller should only be called after
 * {@link controllers.users.usersData.deserializeAndCleanUserData deserialization}
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {models.User & {oldPassword: string}} [req.body]
 * @param {[]} [req.files]
 * @param {[]} [req.filesToDelete]
 * @param {models.User} [req.user]
 * @param {e.Response} res
 * @memberOf controllers.users.usersData
 */
const updateUser = (req, res) => {
	let newData = {...req.body};
	delete newData.password;
	delete newData.oldPassword

	/* If new file is available, then user wants to change their avatar. */
	if (req.files && req.files[0] && newData.photo === 'new'){
		if (req.files[0].contentType.substring(0, 5) !== 'image'){
			return res.status(400).json({
				error: {status: 400, message: 'Avatar should be an image'}
			})
		}
		newData.photo = ObjectId(req.files[0].id.toString());
	}
	/* Update password only if the correct old password is provided */
	if (req.body.password){
		if (req.user.checkCredentials(req.body.oldPassword)){
			newData.password = req.body.password;
		} else {
			return res.status(401).json({
				error:{ status: 401, message: 'old password is wrong'}
			})
		}
	}

	let newUser = req.user;
	newUser.updated = Date.now();

	// Don't allow changing fields, that are only updated via other API endpoints
	for (let f of CONSTANTS.NON_UPDATABLE_USER_FIELDS){
		newData[f] = undefined;
		delete newData[f];
	}

	// `name` should always remain a non-hidden field
	if (!Array.isArray(newData.hiddenFields) || newData.hiddenFields.includes('name')){
		return res.status(400).json({
			error:{
				status: 400,
				message: 'Cannot make name a hidden field'
			}
		})
	}

	try {
		extend(newUser, newData);
	} catch (err){
		return handleError(err, res);
	}
	return newUser.save()
		.then(updatedUser => res.json(
			{ user: updatedUser, message: 'User updated successfully'})
		)
		.catch(err => handleError(err, res))
}
exports.updateUser = updateUser;

/**
 * @type function
 * @throws 401
 * @description lets subsequent middleware be invoked only if the authenticated user is equal
 * to the user who was found by id with the {@link controllers.users.usersData.userById} and
 * is present in the `req.user` object
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {models.User} [req.user]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.usersData
 */
const isAuthenticatedUser = (req, res, next) => {
	if (!req.auth._id.equals(req.user._id)){
		return res.status(401).json({
			error: {
				status: 401,
				message: 'You are not authorized to perform such operations to this user'
			}
		})
	}
	return next();
}
exports.isAuthenticatedUser = isAuthenticatedUser;

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
		.catch(err => handleError(err, res))
}
exports.removeUserMentions = removeUserMentions;

/**
 * @type function
 * @description deletes the user, specified in `req.user`
 * @param {e.Request} req
 * @param {models.User} req.user
 * @param {e.Response} res
 * @memberOf controllers.users.usersData
 */
const deleteUser = (req, res) => {
	return User.deleteOne({ _id: req.user._id})
		.then(() =>
			res.json({ message: 'user deleted successfully'})
		)
		.catch(err => handleError(err, res))
}
exports.deleteUser = deleteUser;

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


// -----------------------------------------------------------------------
// this lower part is still not finished and is not fully implemented.
//

exports.configUsersFilter = (req, res, next) => {
	req.usersFilter = req.query;
	return next();
}
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