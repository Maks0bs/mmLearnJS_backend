let newsRouter = require('../news/router')
let authRouter = require('../auth/router')
let router = require('express').Router()

router.use('/news', newsRouter);
router.use('/auth', authRouter)

module.exports = router;