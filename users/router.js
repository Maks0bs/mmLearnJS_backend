let {
	requireAuthentication,
} = require('../auth/controller');
let {
	getUser,
	userById,
	addNotifications,
	getUsersFiltered
} = require('./controller');
let router = require('express').Router()

router.get('/:userId', getUser);
//router.post('/notifications/', addNotifications);
router.post('/filter', getUsersFiltered);

router.param('userId', userById);

module.exports = router;