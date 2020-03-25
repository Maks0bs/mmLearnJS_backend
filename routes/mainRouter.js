let newsRouter = require('../news/router')
let router = require('express').Router()

router.use('/news', newsRouter);

module.exports = router;