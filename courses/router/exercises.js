let {
    userInCourse, requireAuthentication
} = require('../../users/controllers')

let {
    getExerciseAttempts, newExerciseAttempt, attemptById, correctAttemptOwner,
    getAttempt, updateAttempt, finishAttempt, getExercise,
} = require('../controllers')

let router = require('express').Router()

//TODO change of frontend
router.get('/user-attempts',
    requireAuthentication,
    userInCourse,
    getExerciseAttempts
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
);
//TODO change of frontend
router.get('/',
    requireAuthentication,
    userInCourse,
    getExercise
    //TODO check with a controller if the user is allowed to view the exercise
    // (if it is a member of a course to which the forum has a ref)
)
//TODO change of frontend
router.post('/new-attempt',
    requireAuthentication,
    userInCourse,
    newExerciseAttempt
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
)
//TODO change of frontend
router.get('/attempt/:attemptId',
    requireAuthentication,
    userInCourse,
    correctAttemptOwner,
    getAttempt
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
)
//TODO change of frontend
router.put('/attempt/:attemptId',
    requireAuthentication,
    userInCourse,
    correctAttemptOwner,
    updateAttempt
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
)
//TODO change of frontend
router.post('/attempt/:attemptId/finish',
    requireAuthentication,
    userInCourse,
    correctAttemptOwner,
    finishAttempt
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
)

router.param('attemptId', attemptById);

module.exports = router;