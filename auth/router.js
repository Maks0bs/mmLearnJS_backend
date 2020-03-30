let {
	signup,
	activateAccount,
	signin,
	extendSession
} = require('./controller');
let router = require('express').Router()

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/activate', activateAccount)
router.get('/extend-session', extendSession);

module.exports = router;