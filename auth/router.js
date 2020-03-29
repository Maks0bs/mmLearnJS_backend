let {
	signup,
	activateAccount,
	signin,
	test
} = require('./controller');
let router = require('express').Router()

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/activate', activateAccount)
router.get('/test', test);

module.exports = router;