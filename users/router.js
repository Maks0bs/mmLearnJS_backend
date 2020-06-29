let {
	requireAuthentication,
} = require('../auth/controller');
let {
	getUser,
	userById,
	addNotifications,
	getUsersFiltered,
	updateUser,
	deserializeAndCleanData,
	isAuthenticatedUser,
	getUpdatesByDate
} = require('./controller');
let {
	uploadFiles
} = require('../files/controller')
let router = require('express').Router()

router.get('/:userId', getUser);
//router.post('/notifications/', addNotifications);
router.post('/filter', getUsersFiltered);

router.param('userId', userById);

router.put('/:userId',
	requireAuthentication,
	isAuthenticatedUser,
	uploadFiles,
	deserializeAndCleanData,
	updateUser
);
router.post('/updates-by-date',
	requireAuthentication,
	getUpdatesByDate
)

module.exports = router;