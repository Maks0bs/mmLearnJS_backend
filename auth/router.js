let {
	signup,
	activateAccount,
	signin,
	getAuthenticatedUser,
	requireAuthentication,
	logout,
	inviteSignup,
	sendActivationLink,
	forgotPassword,
	resetPassword
} = require('./controller');
let router = require('express').Router()

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/activate', activateAccount);
router.get('/cur-user', getAuthenticatedUser);
router.get('/logout', logout);
router.post('/invite-signup', inviteSignup);
router.post('/send-activation', requireAuthentication, sendActivationLink)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

module.exports = router;