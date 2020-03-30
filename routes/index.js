let newsRouter = require('../news/router')
let authRouter = require('../auth/router')
let router = require('express').Router()
let { extendSession } = require('../auth/controller')

router.use('/news', newsRouter);
router.use('/auth', authRouter)

module.exports = router;