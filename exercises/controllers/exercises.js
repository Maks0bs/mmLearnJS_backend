let { ExerciseAttempt } = require('../model/ExerciseAttempt');
let Exercise = require('../model')
const {handleError} = require("../../helpers");
let { getExerciseUserStatus } = require('../helpers')

const CONSTANTS = {
    RELEVANT_EXERCISE_USER_FIELDS:
        ['_id', 'name', 'photo', 'hiddenFields', 'teacherCourses', 'enrolledCourses']
}
exports.EXERCISE_DATA_CONSTANTS = CONSTANTS;

/**
 * @class controllers.exercises
 */

/**
 * @type function
 * @description Saves the exercises, which match the MongoDB
 * query criteria, described in `req.exercisesConfig.filter` to `req.exercises`.
 * Please also provide the reference to the course which
 * contains a member who wants to perform further actions
 * with exercises in `req.exercisesConfig.course`. If the course
 * reference is not provided, info about participants
 * will be unavailable. Some data
 * will be hidden to only show data which is relevant from
 * the perspective of a member of this course. Optionally,
 * the relation to the given course can be provided
 * under `req.exercisesConfig.userStatus` which can be falsy
 * or equal to `student` or `teacher`.
 * !!!PLEASE ONLY USE THIS MIDDLEWARE TO RETRIEVE
 * EXERCISES FROM THE DATABASE AND THEN SEND THEM TO USER!!! Avoid
 * using custom middleware that calls find/search operations
 * on the Exercise model. You can use other middleware to configure this one
 * and then works with the resulting courses.
 * NOTE: this middleware does not send any data
 * about exercise attempts. See docs
 * for other middleware that sends the attempts of exercise participants.
 * If wanted exercises were found earlier, please provide them
 * under `req.exercisesConfig.foundExercises`. The provided
 * exercises should have the following populated fields:
 * `exercise.participants.user` and `exercise.tasks`. In this case
 * all the same operations will be applied to the provided
 * exercises instead of invoking a find query inside this controller
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {Object} req.exercisesConfig
 * @param {models.User} req.auth
 * @param {models.Exercise[]} req.exercises
 * @param {models.Course} [req.exercisesConfig.course]
 * @param {models.Exercise[]} [req.exercisesConfig.foundExercises]
 * @param {string} req.exercisesConfig.userStatus
 * @param {Object} req.exercisesConfig.filter
 * @param {function} next
 * @memberOf controllers.exercises
 */
const getFormattedExercises = (req, res, next) => {
    let memberSet = {}, teacherSet = {}, { exercisesConfig: config } = req;
    req.auth.enrolledCourses.forEach(c => memberSet[c] = true);
    if (Array.isArray(req.auth.teacherCourses)){
        req.auth.teacherCourses.forEach(c => {
            memberSet[c] = true
            teacherSet[c] = true
        });
    }
    let {course, filter, foundExercises } = config, courseMembersSet = {};
    req.exercises = [];
    // s._id || s is used to work with both direct ObjectIDs and mongo Documents
    if (course){
        course.students.forEach(s => courseMembersSet[s._id || s] = true)
        course.teachers.forEach(t => courseMembersSet[t._id || t] = true)
    }
    let getExercises;
    // getExercises returns a thenable function that returns the exercises.
    // this works both with a mongoose Query and a Promise
    if (foundExercises){
        getExercises = () => Promise.resolve(foundExercises);
    } else {
        getExercises = () => Exercise.find({...filter})
            .populate('participants.user', CONSTANTS.RELEVANT_EXERCISE_USER_FIELDS)
            .populate('tasks')
    }
    return getExercises()
        .then(exercises => {
            return exercises.forEach(e => {
                // status has to be calculated independently each time
                // the provided req.exercisesConfig.course is irrelevant
                // here, because it can contain a misleading reference.
                // If we rely on the course ref, some unwanted data leaks might occur
                let status = getExerciseUserStatus(e, req.auth, memberSet, teacherSet),
                    hasActiveAttempt = false;
                e.courseRefs = undefined;
                if (!status || ((status === 'student') && !e.available)) return;
                // leave only participants that are relevant for the provided course
                e.participants = e.participants && e.participants.filter(
                    p => courseMembersSet[p.user._id]
                )
                e.participants.forEach(p => p.user.hideFields());
                if (Array.isArray(e.tasks)) e.tasks.forEach((t, j) => {
                    e.tasks[j].exerciseRefs = undefined;
                })
                if (e.participants.length === 0) e.participants = undefined;
                if (status === 'teacher') return req.exercises.push(e);
                e.weight = undefined;
                let participant = e.participants && e.participants.find(
                    p => p.user._id.equals(req.auth._id)
                )
                if (participant && Array.isArray(participant.attempts)){
                    hasActiveAttempt = participant.attempts
                        .findIndex(a => !a.endTime) >= 0;
                }
                e.participants = undefined;
                if (!hasActiveAttempt || !e.available){
                    e.tasks = undefined;
                } else if (Array.isArray(e.tasks)){
                    //Otherwise remove correct answers from task data
                    e.tasks.forEach((t, i) => {
                        e.tasks[i].correctAnswer = undefined;
                        e.tasks[i].correctAnswers = undefined;
                    })
                }
                req.exercises.push(e);
            })
        })
        .then(() => next())
        .catch(err => {handleError(err, res)})
}
exports.getFormattedExercises = getFormattedExercises;

/**
 * @type function
 * @throws 403
 * @description Creates a new attempt in the given exercise, whereas
 * the participant of this attempt is the authenticated user
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.User} req.auth
 * @param {models.Exercise} req.exercise
 * @param {string} req.userExerciseStatus
 * @memberOf controllers.exercises
 */
const newExerciseAttempt = (req, res) => {
    let {exercise} = req;
    let { participants } = exercise, hasRunningAttempt = false;
    if (!Array.isArray(participants)) participants = [];

    if (!exercise.available || !(req.userExerciseStatus === 'student')){
        return res.status(403).json({
            error: {
                status: 403,
                message: 'Not authorized! Only students can create attempts for ' +
                    'exercises that are exercises'
            }
        })
    }
    let userPos = participants.findIndex(p => p.user.equals(req.auth._id))
    if (userPos >= 0 && Array.isArray(participants[userPos].attempts)){
        let index = participants[userPos].attempts.findIndex(a => !a.endTime)
        hasRunningAttempt = index >= 0;
    }
    if (hasRunningAttempt){
        return res.status(403).json({
            error: {
                status: 403,
                message: 'You already have a running attempt on this course. ' +
                    'Finish it and then you will be able to start a new one'
            }
        })
    }

    if (userPos < 0){
        exercise.participants.push({ user: req.auth._id, attempts: []})
        userPos = exercise.participants.length - 1;
    }

    let newAttempt = new ExerciseAttempt({
        respondent: req.auth._id, exerciseRef: exercise._id, answers: []
    });
    if (Array.isArray(exercise.tasks)) exercise.tasks.forEach(t => {
        let ans;
        switch (t.kind){
            case 'MultipleChoiceTask':{
                ans = { kind: 'MultipleChoiceTaskAttempt', values: [] }
                break;
            }
            case 'OneChoiceTask':{
                ans = { kind: 'OneChoiceTaskAttempt', value: null }
                break;
            }
            case 'TextTask': {
                ans = { kind: 'TextTaskAttempt', value: null }
                break;
            }
            default: {
                ans = {};
                break;
            }
        }
        ans.taskRef = t._id;
        newAttempt.answers.push(ans);
    })
    exercise.participants[userPos].attempts.push(newAttempt);

    return Promise.all([exercise.save(), newAttempt.save()])
        .then(() => {res.json(newAttempt)})
        .catch(err => {handleError(err, res)})
}
exports.newExerciseAttempt = newExerciseAttempt;

/**
 * @type function
 * @throws 404
 * @description sends the attempts that the authenticated user committed
 * in the exercise with the given ID. The result is only
 * relevant for STUDENTS (teachers don't have any attempts)
 * @param {models.Exercise} req.exercise
 * @param {string} req.userExerciseStatus
 * @param {models.User} req.auth
 * @param {e.Request} req
 * @param {e.Response} res
 * @memberOf controllers.exercises
 */
const getExerciseAttempts = (req, res) => {
    let {exercise} = req;
    if (req.userExerciseStatus === 'teacher'){
        return res.status(403).json({
            error: {status: 403, message: 'Teachers do not have any attempts'}
        })
    }
    if (!Array.isArray(exercise.participants)){
        return res.json([]);
    }
    let participant = exercise.participants.find(p => p.user.equals(req.auth._id));
    let attempts = participant ? participant.attempts : []
    attempts.sort((a, b) => b.startTime - a.startTime)
    return res.json(attempts);
}
exports.getExerciseAttempts = getExerciseAttempts;

const removeExerciseMentions = (req, res, next) => {
    //TODO remove exercise mentions
}
exports.removeExerciseMentions = removeExerciseMentions;

const deleteExercises = (req, res, next) => {
    //TODO delete exercises
}
exports.deleteExercises = deleteExercises;

