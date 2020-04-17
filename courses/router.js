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
	getCleanupFiles,
	getNewCourseData
} = require('./controller')

let {
	deleteFiles,
	uploadFiles
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
	uploadFiles,
	getNewCourseData,
	getCleanupFiles,
	deleteFiles,
	updateCourse
);
//router.get('/:courseId', getCourse);


router.param('courseId', courseById);

module.exports = router;