let { getExerciseUserStatus } = require('../helpers')

/**
 * @type function
 * @throws 401
 * @description lets subsequent middleware get invoked
 * only if the authenticated user is a member of
 * a course to which the given exercise has a reference.
 * If the authenticated user is authorized
 * for further actions, this middleware
 * also adds the user's status to `req.userExerciseStatus`
 * which can be equal to `student` or `teacher`
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Exercise} req.exercise
 * @param {models.User} req.auth
 * @param {string} req.userExerciseStatus
 * @param {function} next
 * @memberOf controllers.exercises
 */
const userInExercise = (req, res, next) => {
    let status = getExerciseUserStatus(req.exercise, req.auth) || undefined;
    if(status === 'teacher' || ((status === 'student') && req.exercise.available)){
        req.userExerciseStatus = status;
        return next();
    } else {
        return res.status(401).json({
            error: {
                status: 401,
                message: 'You are not allowed to access this exercise'
            }
        })
    }
}
exports.userInExercise = userInExercise;