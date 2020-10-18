let newsRouter = require('../news/router')
let coursesRouter = require('../courses/router')
let filesRouter = require('../files/router')
let exerciseRouter = require('../exercises/router')
let forumsRouter = require('../forums/router')
let usersRouter = require('../users/router');
let { extendSession, authenticate } = require('../users/controllers')

let router = require('express').Router()
router.use('/news', newsRouter);
router.use('/files', authenticate, filesRouter);
router.use('/', authenticate, extendSession);
router.use('/', exerciseRouter);
router.use('/', forumsRouter);
router.use('/', coursesRouter);
router.use('/', usersRouter);

module.exports = router;