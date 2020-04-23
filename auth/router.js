let {
	signup,
	activateAccount,
	signin,
	getAuthenticatedUser,
	requireAuthentication,
	logout,
	inviteSignup
} = require('./controller');
let router = require('express').Router()

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/activate', activateAccount);
router.get('/cur-user', getAuthenticatedUser);
router.get('/logout', logout);
router.post('/invite-signup', inviteSignup);

module.exports = router;