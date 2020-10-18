let {
    isTeacher, isCourseCreator, teacherInCourse, userInCourse,
    requireAuthentication, addNotifications
} = require('../../users/controllers')
let {
    enrollInCourse, updateCourse, cleanupCourseData, getNewCourseData,
    deleteCourse, removeCourseMentions, subscribe, unsubscribe, viewCourse,
    sendTeacherInvite, addToInvitedList, acceptTeacherInvite, configureExerciseSummary,
    getExerciseSummary
} = require('../controllers')
let {
    deleteFiles, uploadFiles
} = require('../../files/controllers');

/**
 * @swagger
 * tags:
 *   name: /course/...
 *   description: >
 *     All endpoints connected to updating/changing/managing data in a single course
 */
let router = require('express').Router()

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

//TODO add a getter for a single course (GET /course/:courseId/)

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
router.get('/exercise-summary/:summaryParam',
    requireAuthentication,
    userInCourse,
    configureExerciseSummary,
    getExerciseSummary
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
)


module.exports = router;