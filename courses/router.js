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
	deleteCourse,
	sendTeacherInvite,
	addToInvitedList,
	acceptTeacherInvite
} = require('./controller')

let {
	deleteFiles,
	uploadFiles
} = require('../files/controller');

let {
	addNotifications
} = require('../users/controller')

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
router.post('/send-teacher-invite/:courseId',
	requireAuthentication,
	isCreator,
	sendTeacherInvite,
	addNotifications,
	addToInvitedList//send notification to teacher and add them to invitedTeacher array in db
)
router.post('/accept-teacher-invite/:courseId',
	requireAuthentication,
	isTeacher,
	acceptTeacherInvite
)
//router.get('/:courseId', getCourse);


router.param('courseId', courseById);

module.exports = router;