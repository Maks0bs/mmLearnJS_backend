let {
	isTeacher,
	requireAuthentication,
	isCreator,
	teacherInCourse,
	userInCourse
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
	entryById,
} = require('./controllers')

let {
	createForumTopic,
	answerTopicPost,
	topicById,
	postById,
	deleteTopicPost
} = require('./controllers/forums')

let {
	sendTeacherInvite,
	addToInvitedList,
	acceptTeacherInvite
} = require('./controllers/teachers')

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
	teacherInCourse,
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
router.post('/:courseId/forum/:entryId/new-topic',
	requireAuthentication,
	userInCourse,
	createForumTopic,
)
router.post('/:courseId/forum/:entryId/topic/:topicId/post/:postId/answer',
	requireAuthentication,
	userInCourse,
	answerTopicPost
)
router.delete('/:courseId/forum/:entryId/topic/:topicId/post/:postId',
	requireAuthentication,
	userInCourse,
	deleteTopicPost
)


router.param('courseId', courseById);
router.param('entryId', entryById);
router.param('topicId', topicById);
router.param('postId', postById);

module.exports = router;