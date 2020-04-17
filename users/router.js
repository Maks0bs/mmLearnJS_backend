let {
	requireAuthentication,
} = require('../auth/controller');
let {
	getUser,
	userById
} = require('./controller');
let router = require('express').Router()

router.get('/:userId', getUser);

router.param('userId', userById);

module.exports = router;