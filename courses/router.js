let {
	isTeacher,
	requireAuthentication,
	isCreator
} = require('../auth/controller')

let {
	createCourse,
	enrollInCourse,
	getCoursesFiltered,
	updateCourse,
	courseById,
	updateCleanup,
	getCleanupFiles,
	getNewCourseData,
	deleteCourse
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
router.delete('/:courseId', 
	requireAuthentication, 
	isCreator,
	deleteCourse
);
//router.get('/:courseId', getCourse);


router.param('courseId', courseById);

module.exports = router;