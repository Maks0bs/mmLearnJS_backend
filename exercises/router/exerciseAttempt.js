let {
    requireAuthentication
} = require('../../users/controllers')
let {
    correctAttemptOwner, getAttempt, updateAttemptAnswers, finishAttempt,
} = require('../controllers')

/**
 * @swagger
 * tags:
 *   name: /exercise-attempt/...
 *   description: >
 *     All endpoints related to updating/fetching data from a single exercise
 */
let router = require('express').Router()

router.get('/',
    requireAuthentication,
    correctAttemptOwner,
    getAttempt
)//TODO add tests for this

router.put('/',
    requireAuthentication,
    correctAttemptOwner,
    updateAttemptAnswers
)//TODO add tests for this

router.post('/finish',
    requireAuthentication,
    correctAttemptOwner,
    finishAttempt
)//TODO add tests for this

module.exports = router;