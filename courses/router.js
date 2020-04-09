let {
	isTeacher,
	requireAuthentication
} = require('../auth/controller')

let {
	createCourse,
	enrollInCourse,
	getCoursesFiltered,
	updateCourse
} = require('./controller')

let router = require('express').Router()

router.post('/create', 
	requireAuthentication,
	isTeacher, 
	createCourse
);
router.post('/enroll', requireAuthentication, enrollInCourse);
router.post('/filter', getCoursesFiltered)
router.put('/update', 
	requireAuthentication, 
	isTeacher, 
	updateCourse
);

module.exports = router;