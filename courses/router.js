let {
	isTeacher,
	requireAuthentication
} = require('../auth/controller')

let {
	createCourse,
	enrollInCourse
} = require('./controller')

let router = require('express').Router()

router.post('/create', 
	requireAuthentication,
	isTeacher, 
	createCourse
);
router.post('/enroll', enrollInCourse)

module.exports = router;