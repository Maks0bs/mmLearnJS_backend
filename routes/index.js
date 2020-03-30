let newsRouter = require('../news/router')
let authRouter = require('../auth/router')
let router = require('express').Router()
let { extendSession, authenticate } = require('../auth/controller')

router.use('/news', authenticate, extendSession, newsRouter);
router.use('/auth', authenticate, extendSession, authRouter)

module.exports = router;