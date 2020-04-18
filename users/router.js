let {
	requireAuthentication,
} = require('../auth/controller');
let {
	getUser,
	userById,
	addNotifications,
	testtest
} = require('./controller');
let router = require('express').Router()

router.get('/:userId', getUser);
router.post('/notifications/', addNotifications, testtest);

router.param('userId', userById);

module.exports = router;