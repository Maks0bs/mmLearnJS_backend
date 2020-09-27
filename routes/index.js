let newsRouter = require('../news/router')
let coursesRouter = require('../courses/router')
let filesRouter = require('../files/router')
let usersRouter = require('../users/router');
let { extendSession, authenticate } = require('../users/controllers/auth')

let router = require('express').Router()
router.use('/news', newsRouter);
router.use('/', authenticate, extendSession, usersRouter);
router.use('/courses', authenticate, extendSession, coursesRouter);
router.use('/files', authenticate, filesRouter);

module.exports = router;