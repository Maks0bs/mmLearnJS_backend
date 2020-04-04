let {
	isTeacher,
	requireAuthentication
} = require('../auth/controller')

let {
	createCourse,
	enrollInCourse,
	getCoursesFiltered
} = require('./controller')

let router = require('express').Router()

router.post('/create', 
	requireAuthentication,
	isTeacher, 
	createCourse
);
router.post('/enroll', requireAuthentication, enrollInCourse);
router.post('/filter', getCoursesFiltered)

module.exports = router;