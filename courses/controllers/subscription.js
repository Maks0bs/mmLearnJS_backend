let User = require('../../users/model');
const { handleError } = require("../../helpers");
/**
 * @class controllers.courses.subscription
 */

/**
 * @type function
 * @throws 403
 * @description subscribes the authenticated user to the given course.
 * In order to subscribe, the user has to be a member (teacher/student)
 * of the course.
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {models.User} req.auth
 * @memberOf controllers.courses.subscription
 */
const subscribe = (req, res) => {
    let {course} = req;
    if (course.subscribers.includes(req.auth._id)){
        return res.status(403).json({
            error: {
                status: 403,
                message: 'You are already subscribed to the course'
            }
        })
    }
    course.subscribers.push(req.auth);
    return course.save()
        .then(savedCourse => {
            let courseData = { lastVisited: Date.now(), course: savedCourse }
            return User.findByIdAndUpdate(
                req.auth._id,
                { $push: { subscribedCourses: courseData } }
            )
        })
        .then(() => {
            return res.json({
                message: 'You have subscribed to updates in this course'
            })
        })
        .catch(err => {handleError(err, res)})
}
exports.subscribe = subscribe;

/**
 * @type function
 * @throws 403
 * @description removes the subscription of the
 * authenticated user to the given course.
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {models.User} req.auth
 * @memberOf controllers.courses.subscription
 */
const unsubscribe = (req, res) => {
    let {course} = req;
    // there might be several occurrences of one subscribed user (that's a bug)
    // that's why we don't remove a single instance, but all found instances
    let newSubscribers = course.subscribers.filter(c => !c.equals(req.auth._id));

    if (newSubscribers.length === course.subscribers.length){
        return res.status(403).json({
            error: {
                status: 403,
                message:
                    'You are not subscribed to the course, ' +
                    'therefore you can\'t unsubscribe'
            }
        })
    }
    course.subscribers = newSubscribers;

    return course.save()
        .then(savedCourse => {
            return User.findByIdAndUpdate(
                req.auth._id,
                { $pull: {subscribedCourses: { course: savedCourse._id}}},
                {new: true}
            )
        })
        .then(() => {
            return res.json({
                message: 'You have unsubscribed from updates in this course'
            })
        })
        .catch(err => {handleError(err, res)})
}
exports.unsubscribe = unsubscribe;

/**
 * @type function
 * @throws 400
 * @description updates the time which specifies when
 * the user had viewed the content of the given course for the last time
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {models.User} req.auth
 * @memberOf controllers.courses.subscription
 */
const viewCourse = (req, res) => {
    let user = req.auth, courseId = req.course._id;
    // there might be several occurrences (if any) of a course in the
    // user's subscribed courses list
    for (let i = 0; i < user.subscribedCourses.length; i++){
        if (courseId.equals(user.subscribedCourses[i].course)){
            user.subscribedCourses[i].lastVisited = new Date();
        }
    }
    return user.save()
        .then(() => {
            return res.json({ message: 'course has been viewed'})
        })
        .catch(err => handleError(err, res))
}
exports.viewCourse = viewCourse;