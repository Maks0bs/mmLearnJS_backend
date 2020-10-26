let {
    requireAuthentication
} = require('../../users/controllers')

let {
    getExerciseAttempts, newExerciseAttempt, getFormattedExercises,
    configureFormatSingleExercise, sendSingleExercise, userInExercise
} = require('../controllers')

/**
 * @swagger
 * tags:
 *   name: /exercise/...
 *   description: >
 *     All endpoints related to updating/fetching data from a single exercise
 */
let router = require('express').Router()

router.get('/user-attempts',
    requireAuthentication,
    userInExercise,
    getExerciseAttempts
);//TODO add tests for this

router.get('/',
    requireAuthentication,
    userInExercise,
    configureFormatSingleExercise,
    getFormattedExercises,
    sendSingleExercise
)//TODO add tests for this

router.post('/new-attempt',
    requireAuthentication,
    userInExercise,
    newExerciseAttempt
)//TODO add tests for this

module.exports = router;