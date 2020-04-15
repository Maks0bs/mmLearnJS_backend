let {
	isTeacher,
	requireAuthentication
} = require('../auth/controller')

let {
	createCourse,
	enrollInCourse,
	getCoursesFiltered,
	updateCourse,
	courseById,
	updateCleanup,
	getCleanupFiles
} = require('./controller')

let {
	deleteFiles
} = require('../files/controller');

let router = require('express').Router()

router.post('/create', 
	requireAuthentication,
	isTeacher, 
	createCourse
);
router.post('/enroll/:courseId', requireAuthentication, enrollInCourse);
router.post('/filter', getCoursesFiltered)
router.put('/update/:courseId', 
	requireAuthentication, 
	isTeacher,
	getCleanupFiles,
	deleteFiles,
	updateCourse
);

router.param('courseId', courseById);

module.exports = router;