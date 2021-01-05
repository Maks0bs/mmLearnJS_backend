let User = require('../../users/model');
const {handleError} = require("../../helpers");

/**
 * @type function
 * @throws 401
 * @description Adds the authenticated user in to the
 * list of students of the course, provided under `req.course`
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {models.User} req.auth
 * @param {string} req.userCourseStatus
 * @param {string} [req.query.all]
 * @memberOf controllers.courses
 */
const enrollInCourse = (req, res) => {
    let {course} = req;
    if (course.hasPassword && !course.checkPassword(req.body.password)) {
        return res.status(401).json({
            error: {
                status: 401,
                message: 'wrong course password'
            }
        })
    }
    course.students.push(req.auth);
    return course.save()
        .then(() => //add the course to user's list of enrolled courses
            User.findByIdAndUpdate(
                req.auth._id,
                {$push: {enrolledCourses: { _id: course._id }}},
                {new: true}
            )
        )
        .then(() => (
            res.json({ message: 'Enrollment successful' })
        ))
        .catch(err => {handleError(err, res)})
}
exports.enrollInCourse = enrollInCourse;

/**
 * @type function
 * @throws 401
 * @description Sends the summary on all exercises in which the specified user has
 * participated. Teacher can view summary for all students in their course
 * In order to get info about all students, specify
 * the query param `?all` and set its value to something truthy. If the query is not specified
 * than only the summary for the authenticated user will be sent
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {models.User} req.auth
 * @param {string} req.userCourseStatus
 * @param {string} [req.query.all]
 * @memberOf controllers.courses
 */
const getExerciseSummary = (req, res) => {
    let userIsTeacher =
        (req.userCourseStatus === 'teacher') || (req.userCourseStatus === 'creator');
    let {course} = req, usersSet = {}, users = []
    if (req.query.all){
        // only teachers can view summaries for all students
        if (!userIsTeacher){
            return res.status(401).json({
                error: {
                    status: 401,
                    message: 'Only teachers can view summary on all students'
                }
            })
        }
        if (Array.isArray(course.exercises)) course.exercises.forEach(e => {
            if (Array.isArray(e.participants)) e.participants.forEach(p => {
                users.push(p.user)
            })
        })
    } else {
        users = [req.auth];
    }
    users.forEach(u => usersSet[u._id] = {
        userId: u._id, userName: u.name, exercises: []
    })
    if (Array.isArray(course.exercises)) course.exercises.forEach(e => {
        if (Array.isArray(e.participants)) e.participants.forEach(p => {
            if (!usersSet[p.user._id]) return;
            // remove answers, they are irrelevant for this request
            if (Array.isArray(p.attempts)) p.attempts.forEach((a, index) => {
                p.attempts[index].answers = undefined;
            })
            let exerciseData = { id: e._id, name: e.name, attempts: p.attempts}
            usersSet[p.user._id].exercises.push(exerciseData);
        })
    })
    let result = users.map(u => usersSet[u._id]);
    return res.json(result);
}
exports.getExerciseSummary = getExerciseSummary;