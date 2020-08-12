let {
	requireAuthentication,
} = require('../auth/controllers');
let {
	getUser,
	userById,
	addNotifications,
	getUsersFiltered,
	updateUser,
	deserializeAndCleanData,
	isAuthenticatedUser,
	getUpdatesByDate,
	deleteUser,
	removeUserMentions
} = require('./controller');
let {
	uploadFiles,
	deleteFiles
} = require('../files/controller')
let {
	userInfoValidator
} = require('../auth/controllers/validator')
let router = require('express').Router()

router.get('/:userId', getUser);
//router.post('/notifications/', addNotifications);
router.post('/filter', getUsersFiltered);

router.put('/:userId',
	requireAuthentication,
	isAuthenticatedUser,
	userInfoValidator,
	uploadFiles,
	deserializeAndCleanData,
	deleteFiles,
	updateUser
);
router.delete('/:userId',
	requireAuthentication,
	isAuthenticatedUser,
	removeUserMentions,
	deleteFiles,
	deleteUser
)
router.post('/updates-by-date',
	requireAuthentication,
	getUpdatesByDate
)

router.param('userId', userById);

module.exports = router;