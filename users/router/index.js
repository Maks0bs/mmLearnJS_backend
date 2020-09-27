let authRouter = require('./auth');
let usersDataRouter = require('./usersData');

let router = require('express').Router();

router.use('/auth', authRouter);
router.use('/users', usersDataRouter);
module.exports = router;