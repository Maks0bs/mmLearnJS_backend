const {deleteForums} = require("../../forums/controllers");
const {
    deleteEntries, removeEntriesMentions
} = require("../controllers/entries");
const {
    deleteExercises, removeExerciseMentions
} = require("../../exercises/controllers");
let {
    isTeacher, isCourseCreator, teacherInCourse, userInCourse,
    requireAuthentication, userDataValidator
} = require('../../users/controllers')
let { validate } = require('../../helpers')
let {
    enrollInCourse, updateCourseSections, cleanupCourseData, getNewCourseData,
    deleteCourse, removeCourseMentions, subscribe, unsubscribe, viewCourse,
    sendTeacherInvite, addToInvitedList, acceptTeacherInvite, getExerciseSummary,
    addUpdatesToCourse, mergeCourseBasicFields, updateCourseExercises,
    saveCourseChanges
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

/**
 * @swagger
 * path:
 *  /course/:courseId/enroll:
 *    post:
 *      summary: >
 *        Enrolls the authenticated user in the course with the specified ID
 *      operationId: enrollInCourse
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - name: courseId
 *          in: path
 *          description: >
 *            the id of the course to perform operations with
 *          required: true
 *          type: string
 *      tags:
 *        - "/course/..."
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                password:
 *                  type: string
 *                  description: Should be provided if the course has a password
 *      responses:
 *        "200":
 *          description: Successfully enrolled the user in the given course
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "400":
 *          description: course Id might be invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Not authenticated / wrong course password
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "404":
 *          description: course with given Id could not be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/enroll',
    requireAuthentication,
    enrollInCourse
);//TODO add tests for this

/**
 * @swagger
 * path:
 *  /course/:courseId/send-teacher-invite:
 *    post:
 *      summary: >
 *        Sends the invitation to the specified course to the given email address.
 *      description: >
 *        Sends the invitation to the specified course to the given email address.
 *        If the user with such email is a teacher, add a notification in their account.
 *        Otherwise send an invitation link in the email to signup with a special token.
 *      operationId: sendTeacherInvite
 *      parameters:
 *        - name: courseId
 *          in: path
 *          description: >
 *            the id of the course to perform operations with
 *          required: true
 *          type: string
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/course/..."
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                email:
 *                  type: string
 *                  format: email
 *                  description: The email of the person who you want to invite
 *      responses:
 *        "200":
 *          description: Successfully sent the invitation to the specified user
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "400":
 *          description: invalid email / courseId
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Not enough rights to invite teachers
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "403":
 *          description: the user with the provided email cannot be invited to courses
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/send-teacher-invitation',
    requireAuthentication,
    isCourseCreator,
    userDataValidator(null, 'email'),
    validate,
    sendTeacherInvite,
    addToInvitedList
)//TODO add tests for this

/**
 * @swagger
 * path:
 *  /course/:courseId/accept-teacher-invite:
 *    post:
 *      summary: >
 *        the authenticated user accepts the invitation to the given course
 *      description: >
 *        the authenticated user
 *        accepts the invitation to the course with the specified ID and therefore
 *        gets added to the teacher list of this course and the course
 *        gets added to the user's `teacherCourses` list. If the user
 *        had a notification that mentioned, that the user was
 *        invited to this course, this notification is removed.
 *      operationId: acceptTeacherInvite
 *      parameters:
 *        - name: courseId
 *          in: path
 *          description: >
 *            the id of the course to perform operations with
 *          required: true
 *          type: string
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/course/..."
 *      responses:
 *        "200":
 *          description: >
 *            Invitation accepted and the user is now a teacher in the given course
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "400":
 *          description: invalid courseId
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Not authorized to accept an invitation to the given course
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/accept-teacher-invitation',
    requireAuthentication,
    isTeacher,
    acceptTeacherInvite
)//TODO add tests for this

/**
 * @swagger
 * path:
 *  /course/:courseId/subscribe:
 *    post:
 *      summary: >
 *        Subscribes the authenticated user to the given course.
 *        In order to subscribe, the user has to be a member (teacher/student)
 *        of the course.
 *      operationId: subscribeToCourse
 *      parameters:
 *        - name: courseId
 *          in: path
 *          description: >
 *            the id of the course to perform operations with
 *          required: true
 *          type: string
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/course/..."
 *      responses:
 *        "200":
 *          description: >
 *            Authenticated ser has successfully subscribed to the given course
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "401":
 *          description: unauthorized (most likely unauthenticated)
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "403":
 *          description: User is already subscribed to the course
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/subscribe',
    requireAuthentication,
    userInCourse,
    subscribe
)//TODO add tests for this

/**
 * @swagger
 * path:
 *  /course/:courseId/unsubscribe:
 *    post:
 *      summary: >
 *        Removes the subscription of the authenticated user
 *        to the given course.
 *      operationId: unsubscribeFromCourse
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - name: courseId
 *          in: path
 *          description: >
 *            the id of the course to perform operations with
 *          required: true
 *          type: string
 *      tags:
 *        - "/course/..."
 *      responses:
 *        "200":
 *          description: >
 *            Authenticated ser has successfully unsubscribed from the given course
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "401":
 *          description: unauthorized (most likely unauthenticated)
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "403":
 *          description: User was not originally subscribed to the course
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/unsubscribe',
    requireAuthentication,
    userInCourse,
    unsubscribe
)//TODO add tests for this

/**
 * @swagger
 * path:
 *  /course/:courseId/view:
 *    post:
 *      summary: >
 *        updates the time which specifies when
 *        the user had viewed the content of the given course for the last time
 *      operationId: viewCourse
 *      parameters:
 *        - name: courseId
 *          in: path
 *          description: >
 *            the id of the course to perform operations with
 *          required: true
 *          type: string
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/course/..."
 *      responses:
 *        "200":
 *          description: >
 *            Authenticated ser has successfully viewed the course content
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "401":
 *          description: unauthorized (most likely unauthenticated)
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.get('/view',
    requireAuthentication,
    viewCourse
)//TODO add tests for this

//TODO !!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!
// add functionality to remove refs to existing exercises/entries/forums!!!!!
router.delete('/',
    requireAuthentication,
    isCourseCreator,
    removeCourseMentions,
    deleteFiles,
    deleteCourse
);//TODO add tests for this

//TODO huge refactoring should be done
router.put('/',
    requireAuthentication,
    isTeacher,
    teacherInCourse,
    uploadFiles,
    getNewCourseData,
    cleanupCourseData,
    addUpdatesToCourse,
    updateCourseSections,
    updateCourseExercises,
    mergeCourseBasicFields,
    // removeExerciseMentions,
    // deleteExercises,
    // removeEntriesMentions,
    // deleteEntries,
    // deleteForums,
    // deleteFiles,
    saveCourseChanges,
);


//TODO add a getter for a single course (GET /course/:courseId/)





//TODO change of frontend
//TODO maybe move this to ./exercises or the correspondent directory!!!!!!!!!!
router.get('/exercise-summary',
    requireAuthentication,
    userInCourse,
    getExerciseSummary
    //TODO check with a controller if the user is allowed to edit the exercise
    // (if it is a teacher of a course to which the forum has a ref)
)


module.exports = router;