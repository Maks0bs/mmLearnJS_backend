let Course = require('../../courses/model')
let Exercise = require('../model')
let { ExerciseAttempt } = require('../model/ExerciseAttempt')
const {handleError} = require("../../helpers");
let { getExerciseUserStatus } = require('../helpers')
let {EXERCISE_DATA_CONSTANTS} = require('./exercises')
let { RELEVANT_EXERCISE_USER_FIELDS} = EXERCISE_DATA_CONSTANTS
/**
 * @type function
 * @throws 400, 404
 * @description works with the `:exerciseId` param in the url. Adds all the data
 * about the exercise with the ID the provided parameter. Adds all exercise data to
 * the request object under the `req.exercise` property
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Exercise} req.exercise
 * @param {function} next
 * @param {string} id - the id of the exercise that should be found
 * @memberOf controllers.exercises
 */
const exerciseById = (req, res, next, id) => {
    return Exercise.findOne({_id: id})
        .populate('tasks')
        .populate({
            path: 'participants',
            populate:[
                {path: 'user', select: RELEVANT_EXERCISE_USER_FIELDS},
                {path: 'attempts'}
            ]
        })
        .then(exercise => {
            if (!exercise) throw {
                status: 404, error: 'Exercise not found'
            }
            return exercise;
        })
        .then(ex => {
            // hide fields of topic/post creators
            if (Array.isArray(ex.participants)) ex.participants.forEach((p, i) => {
                let newUser = p.user;
                newUser.hideFields();
                ex.participants[i].user = newUser;
            })
            req.exercise = ex;
            return next();
        })
        .catch(err => handleError(err, res))
}
exports.exerciseById = exerciseById;

/**
 * @type function
 * @throws 400, 404
 * @description it configure the
 * {@link controllers.exercises.getFormattedExercises getFormattedExercises}
 * controller to work with the course, which was found previously via the
 * {@link controllers.exercises.exerciseById exerciseById} controller.
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Exercise} req.exercise
 * @param {models.Course} [req.exercisesConfig.course]
 * @param {models.Exercise[]} [req.exercisesConfig.foundExercises]
 * @param {string} req.exercisesConfig.userStatus
 * @param {Object} req.exercisesConfig.filter
 * @param {function} next
 * @memberOf controllers.exercises
 */
const configureFormatSingleExercise = (req, res, next) => {
    let courseRef = req.query.courseRef || req.query.courseref;
    req.exercisesConfig = {
        filter: { _id: req.exercise._id },
        foundExercises: [req.exercise]
    }
    if (!courseRef){
        return next();
    } else {
        return Course.findById(courseRef)
            .then(course => {
                if (!course) throw {
                    status: 404, error: 'Course in query param not found'
                }
                req.exercisesConfig.course = course;
            })
            .then(() => next())
            .catch(err => handleError(err, res))
    }
}
exports.configureFormatSingleExercise = configureFormatSingleExercise;


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

/**
 * @type function
 * @description Sends exercises under `req.exercises` as a response
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Exercise[]} req.exercises
 * @memberOf controllers.courses
 */
const sendExercises = (req, res) => {
    return res.json(req.exercises);
}
exports.sendExercises = sendExercises;

/**
 * @type function
 * @description Sends the first exercise in the `req.exercises` array as a response
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Exercise[]} req.exercises
 * @memberOf controllers.courses
 */
const sendSingleExercise = (req, res) => {
    return res.json(req.exercises[0] || {});
}
exports.sendSingleExercise = sendSingleExercise;

/**
 * @type function
 * @throws 400, 404
 * @description works with the `:attemptId` param in the url. Adds all the data
 * about the exercise attempt with the ID from the provided parameter.
 * Adds all attempt data to the request object under the `req.attempt` property.
 * NOTE: this controller should always be invoked after calling the
 * {@link controllers.exercises.exerciseById exerciseById} controller.
 * If the exerciseRef is not equal to the id of the exercise in `req.exercise`
 * than
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Exercise.ExerciseAttempt} req.attempt
 * @param {function} next
 * @param {string} id - the id of the attempt that should be found
 * @memberOf controllers.exercises
 */
const attemptById = (req, res, next, id) => {
    return ExerciseAttempt.findOne({_id: id})
        .populate('respondent', RELEVANT_EXERCISE_USER_FIELDS)
        .populate({
            path: 'exerciseRef',
            populate: {path: 'tasks'}
        })
        .then(attempt => {
            if (!attempt) throw {
                status: 404, error: 'Exercise attempt not found'
            }
            return attempt;
        })
        .then(attempt => {
            let newRespondent = attempt.respondent;
            newRespondent.hideFields();
            attempt.respondent = newRespondent;
            req.attempt = attempt;
            return next();
        })
        .catch(err => handleError(err, res))
}
exports.attemptById = attemptById;

/**
 * @type function
 * @throws 403
 * @description lets subsequent middleware get invoked
 * only if the authenticated user is the the owner of
 * the attempt in `req.attempt` or the user is allowed
 * to view/modify this attempt (is a teacher)
 * This middleware
 * also adds the user's status to `req.userAttemptStatus`
 * which can be equal to `student` or `teacher`
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Exercise.ExerciseAttempt} req.attempt
 * @param {string} req.userAttemptStatus
 * @param {models.User} req.auth
 * @param {function} next
 * @memberOf controllers.exercises
 */
const correctAttemptOwner = (req, res, next) => {
    let status = getExerciseUserStatus(req.attempt.exerciseRef, req.auth);
    req.userAttemptStatus = status;
    let isTeacher = status === 'teacher';
    let isAttemptOwner = req.auth._id.equals(req.attempt.respondent._id);
    let isStudent = (status === 'student') && isAttemptOwner;
    if (isTeacher || isStudent) return next();
    return res.status(403).json({
        error: {status: 403, message: 'You are not authorized to view this attempt'}
    })
}
exports.correctAttemptOwner = correctAttemptOwner;