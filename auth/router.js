let {
	signup,
	activateAccount
} = require('./controller');
let router = require('express').Router()

router.post('/signup', signup);
router.post('/activate', activateAccount)

module.exports = router;