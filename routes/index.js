let newsRouter = require('../news/router')
let authRouter = require('../auth/router')
let coursesRouter = require('../courses/router')
let filesRouter = require('../files/router')
let router = require('express').Router()
let { extendSession, authenticate } = require('../auth/controller')

router.use('/news', newsRouter);
router.use('/auth', authenticate, extendSession, authRouter);
router.use('/courses', authenticate, extendSession, coursesRouter);
router.use('/files', authenticate, filesRouter);

module.exports = router;