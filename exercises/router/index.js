let exerciseRouter = require('./exercise');
let exerciseAttemptRouter = require('./exerciseAttempt');

let {
    exerciseById, attemptById
} = require('../controllers')

let router = require('express').Router();

router.use('/exercise/:exerciseId', exerciseRouter);
router.use('/exercise-attempt/:attemptId', exerciseAttemptRouter);

router.param('exerciseId', exerciseById);
router.param('attemptId', attemptById);

module.exports = router;