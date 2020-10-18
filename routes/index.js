let newsRouter = require('../news/router')
let coursesRouter = require('../courses/router')
let filesRouter = require('../files/router')
let usersRouter = require('../users/router');
let { extendSession, authenticate } = require('../users/controllers')

let router = require('express').Router()
router.use('/news', newsRouter);
router.use('/files', authenticate, filesRouter);
router.use('/', authenticate, extendSession, coursesRouter);
router.use('/', authenticate, extendSession, usersRouter);

module.exports = router;