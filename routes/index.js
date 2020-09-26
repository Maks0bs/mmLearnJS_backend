let newsRouter = require('../news/router')
let authRouter = require('../auth/router')
let coursesRouter = require('../courses/router')
let filesRouter = require('../files/router')
let usersRouter = require('../users/router');
let { extendSession, authenticate } = require('../auth/controllers')

let router = require('express').Router()
router.use('/news', newsRouter);
router.use('/auth', authenticate, extendSession, authRouter);
router.use('/courses', authenticate, extendSession, coursesRouter);
router.use('/files', authenticate, filesRouter);
router.use('/users', authenticate, extendSession, usersRouter);

module.exports = router;