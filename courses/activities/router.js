let {
	createActivity
} = require('./controller');
let router = require('express').Router()

router.post('/create', createActivity);

module.exports = router;