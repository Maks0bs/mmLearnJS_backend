let {
    isTeacher, isCourseCreator, teacherInCourse, userInCourse,
    requireAuthentication, addNotifications
} = require('../../users/controllers')
let {
    createCourse, enrollInCourse, updateCourse, cleanupCourseData, getNewCourseData,
    deleteCourse, removeCourseMentions, subscribe, unsubscribe, viewCourse,
    sendTeacherInvite, addToInvitedList, acceptTeacherInvite, configureExerciseSummary,
    getExerciseSummary
} = require('../controllers')
let {
    deleteFiles, uploadFiles
} = require('../../files/controllers');

let router = require('express').Router()

router.post('/create',
    requireAuthentication,
    isTeacher,
    createCourse
);

//TODO change of frontend
router.post('/enroll', requireAuthentication, enrollInCourse);
//TODO change of frontend
router.put('/update',
    requireAuthentication,
    isTeacher,
    teacherInCourse,
    uploadFiles,
    getNewCourseData,
    cleanupCourseData,
    deleteFiles,
    updateCourse
);
router.delete('/',
    requireAuthentication,
    isCourseCreator,
    removeCourseMentions,
    deleteFiles,
    deleteCourse
);
//TODO change of frontend
router.post('/send-teacher-invite',
    requireAuthentication,
    isCourseCreator,
    sendTeacherInvite,
    addNotifications,
    addToInvitedList//send notification to teacher and add them to invitedTeacher array in db
)
//TODO change of frontend
router.post('/accept-teacher-invite',
    requireAuthentication,
    isTeacher,
    acceptTeacherInvite
)
//TODO change of frontend
router.post('/subscribe',
    requireAuthentication,
    userInCourse,
    subscribe
)
//TODO change of frontend
router.post('/unsubscribe',
    requireAuthentication,
    userInCourse,
    unsubscribe
)
//TODO change of frontend
router.post('/view',
    requireAuthentication,
    viewCourse
)





//TODO change of frontend
//TODO maybe move this to ./exercises or the correspondent directory!!!!!!!!!!
router.get('/:courseId/exercise-summary/:summaryParam',
    requireAuthentication,
    userInCourse,
    configureExerciseSummary,
    getExerciseSummary
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
)


module.exports = router;