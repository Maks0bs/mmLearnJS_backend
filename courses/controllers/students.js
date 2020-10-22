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
 * @memberOf controllers.courses.courseData
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
 * @memberOf controllers.courses.courseData
 * TODO add normal docs for this
 */
const getExerciseSummary = (req, res) => {
    //TODO refactor this
    let userIsTeacher =
        (req.userCourseStatus === 'teacher') || (req.userCourseStatus === 'creator')
    let course = req.course;
    let usersSet = {}, usersToPopulate = []
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
        for (let e of course.exercises){
            for (let p of e.participants){
                // Add to the map of exercise participants
                usersSet[p.user._id] = true;
                usersToPopulate.push(p.user._id)
            }
        }
    } else {
        usersSet[req.auth._id] = true;
        usersToPopulate = [req.auth._id];
    }

    return User.find({
        _id: { $in: usersToPopulate }
    })
        .then((users) => {
            for (let u of users) {
                usersSet[u._id] = {
                    userId: u._id,
                    userName: u.name,
                    exercises: []
                }
            }


            // Has only one loop through all exercises for efficiency
            for (let e of course.exercises){
                for (let p of e.participants){
                    if (!usersSet[p.user._id]){
                        continue;
                    }
                    // remove answers in the final response,
                    // they are irrelevant for this request
                    for (let a = 0; a < p.attempts.length; a++){
                        p.attempts[a].answers = undefined;
                    }
                    usersSet[p.user._id].exercises.push({
                        id: e._id,
                        name: e.name,
                        attempts: p.attempts
                    })
                }
            }

            let result = [];

            for (let k of Object.keys(usersSet)){
                result.push(usersSet[k])
            }

            return res.json(result);
        })
        .catch(err => {
            console.log(err);
            return res.status(err.status || 400)
                .json({
                    error: err
                })
        })
}
exports.getExerciseSummary = getExerciseSummary;