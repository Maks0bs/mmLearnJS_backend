let {
	isTeacher,
	requireAuthentication,
	isCreator,
	teacherInCourse,
	userInCourse
} = require('../auth/controllers')

let {
	createCourse,
	enrollInCourse,
	getCoursesFiltered,
	updateCourse,
	courseById,
	cleanupCourseData,
	getNewCourseData,
	deleteCourse,
	entryById,
	getUpdatesNotifications,
	removeCourseMentions
} = require('./controllers')

let {
	createForumTopic,
	answerTopicPost,
	topicById,
	postById,
	deleteTopicPost
} = require('./controllers/forums')

let {
	subscribe,
	unsubscribe,
	viewCourse
} = require('./controllers/subscription')

let {
	sendTeacherInvite,
	addToInvitedList,
	acceptTeacherInvite
} = require('./controllers/teachers')

let {
	getExerciseAttempts,
	newExerciseAttempt,
	attemptById,
	exerciseById,
	correctAttemptOwner,
	getAttempt,
	updateAttempt,
	finishAttempt,
	getExercise
} = require('./controllers/exercises')

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
	cleanupCourseData,
	deleteFiles,
	updateCourse
);
router.delete('/:courseId', 
	requireAuthentication, 
	isCreator,
	removeCourseMentions,
	deleteFiles,
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
router.post('/subscribe/:courseId',
	requireAuthentication,
	userInCourse,
	subscribe
)
router.post('/unsubscribe/:courseId',
	requireAuthentication,
	userInCourse,
	unsubscribe
)
router.post('/view/:courseId',
	requireAuthentication,
	viewCourse
)
router.post('/updates-notifications',
	requireAuthentication,
	getUpdatesNotifications
)
router.get('/:courseId/exercise/:exerciseId',
	requireAuthentication,
	userInCourse,
	getExercise
)
router.get('/:courseId/exercise/:exerciseId/user-attempts',
	requireAuthentication,
	userInCourse,
	getExerciseAttempts
);
router.post('/:courseId/exercise/:exerciseId/new-attempt',
	requireAuthentication,
	userInCourse,
	newExerciseAttempt
)
router.get('/:courseId/exercise/:exerciseId/attempt/:attemptId',
	requireAuthentication,
	userInCourse,
	correctAttemptOwner,
	getAttempt
)
router.put('/:courseId/exercise/:exerciseId/attempt/:attemptId',
	requireAuthentication,
	userInCourse,
	correctAttemptOwner,
	updateAttempt
)
router.post('/:courseId/exercise/:exerciseId/attempt/:attemptId/finish',
	requireAuthentication,
	userInCourse,
	correctAttemptOwner,
	finishAttempt
)


router.param('courseId', courseById);
router.param('exerciseId', exerciseById);
router.param('attemptId', attemptById);
router.param('entryId', entryById);
router.param('topicId', topicById);
router.param('postId', postById);

module.exports = router;