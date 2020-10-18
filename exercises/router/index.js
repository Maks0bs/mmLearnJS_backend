let {
    userInCourse, requireAuthentication
} = require('../../users/controllers')

let {
    getExerciseAttempts, newExerciseAttempt, attemptById, correctAttemptOwner,
    getAttempt, updateAttempt, finishAttempt, getExercise, exerciseById
} = require('../controllers')

/**
 * @swagger
 * tags:
 *   name: /exercise/...
 *   description: >
 *     All endpoints related to updating/fetching data from a single exercise
 */
let exerciseRouter = require('express').Router()
let router = require('express').Router()

//TODO change of frontend
exerciseRouter.get('/user-attempts',
    requireAuthentication,
    userInCourse,
    getExerciseAttempts
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
);
//TODO change of frontend
exerciseRouter.get('/',
    requireAuthentication,
    userInCourse,
    getExercise
    //TODO check with a controller if the user is allowed to view the exercise
    // (if it is a member of a course to which the forum has a ref)
)
//TODO change of frontend
exerciseRouter.post('/new-attempt',
    requireAuthentication,
    userInCourse,
    newExerciseAttempt
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
)
//TODO change of frontend
exerciseRouter.get('/attempt/:attemptId',
    requireAuthentication,
    userInCourse,
    correctAttemptOwner,
    getAttempt
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
)
//TODO change of frontend
exerciseRouter.put('/attempt/:attemptId',
    requireAuthentication,
    userInCourse,
    correctAttemptOwner,
    updateAttempt
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
)
//TODO change of frontend
exerciseRouter.post('/attempt/:attemptId/finish',
    requireAuthentication,
    userInCourse,
    correctAttemptOwner,
    finishAttempt
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
)

exerciseRouter.param('attemptId', attemptById);

router.use('/exercise/:exerciseId', exerciseRouter);
router.param('exerciseId', exerciseById);
//reserved router for other exercise-related endpoints
module.exports = router;