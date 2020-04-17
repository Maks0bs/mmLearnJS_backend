let {
	signup,
	activateAccount,
	signin,
	getAuthenticatedUser,
	requireAuthentication,
	logout
} = require('./controller');
let router = require('express').Router()

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/activate', activateAccount);
router.get('/cur-user', getAuthenticatedUser);
router.get('/logout', logout)

module.exports = router;