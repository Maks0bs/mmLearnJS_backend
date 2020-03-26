let {
	signup
} = require('./controller');
let router = require('express').Router()

router.post('/signup', signup);

module.exports = router;