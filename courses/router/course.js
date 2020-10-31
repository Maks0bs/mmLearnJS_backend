const {
    getFormattedExercises, sendExercises
} = require("../../exercises/controllers");
let {
    isTeacher, isCourseCreator, teacherInCourse, userInCourse,
    requireAuthentication, userDataValidator
} = require('../../users/controllers')
let { validate } = require('../../helpers')
let {
    enrollInCourse, updateCourseSections, cleanupCourseData, initCourseEditing,
    deleteCourse, removeCourseMentions, subscribe, unsubscribe, viewCourse,
    sendTeacherInvite, addToInvitedList, acceptTeacherInvite, getExerciseSummary,
    addUpdatesToCourse, mergeCourseBasicFields, updateCourseExercises,
    saveCourseChanges, getCourseExercisesConfigure
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
);

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
)

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
)

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
 *        "400":
 *          description: course Id might be invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
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
)

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
 *        "400":
 *          description: course Id might be invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
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
)

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
 *        "400":
 *          description: course Id might be invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
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
)

/**
 * @swagger
 * path:
 *  /course/:courseId/exercises:
 *    get:
 *      summary: >
 *        Sends relevant all available and relevant data
 *        about each exercise that exists in the course with given Id.
 *      description: >
 *        Returns data about each exercise in the given course.
 *        If the authenticated user is a teacher at this course
 *        than they will receive all available data about the
 *        exercise (except for where else this exercise is used and
 *        the participants from other courses are excluded).
 *        If they are a student then they won't receive
 *        data about other participants. If the student has
 *        a running attempt at this course, they will receive
 *        the list of tasks in this course. Otherwise tasks are not available
 *      operationId: getCourseExercises
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
 *          description: Send an array with all proper exercise data
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/Exercise'
 *        "401":
 *          description: unauthorized (unauthenticated / can't access course or some exercise)
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.get('/exercises',
    requireAuthentication,
    userInCourse,
    getCourseExercisesConfigure,
    getFormattedExercises,
    sendExercises
)

/**
 * @swagger
 * path:
 *  /course/:courseId/exercise-summary:
 *    get:
 *      summary: >
 *        Sends the summary about participation in the exercises of the given
 *        course for the authenticated student or info about the participation
 *        of all students for the teacher
 *      description: >
 *        Sends the summary about participation in the exercises of the given
 *        course for the authenticated student or info about the participation
 *        of all students for the teacher. The values that the students
 *        provided as answers during various attempts in the exercise
 *        are not provided in this endpoint.
 *      operationId: getCourseExercisesSummary
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
 *            Send an array with summaries for each user
 *            (contains one element - the summary for authenticated user
 *            if the user is a student)
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    userId:
 *                      type: string
 *                    userName:
 *                      type: string
 *                    exercises:
 *                      type: array
 *                      items:
 *                        type: object
 *                        properties:
 *                          id:
 *                            type: string
 *                            description: >
 *                              the ID of the exercise in which the user has
 *                              participated
 *                          name:
 *                            type: string
 *                            description: >
 *                              the name of the exercise in which the user has
 *                              participated
 *                          attempts:
 *                            type: array
 *                            items:
 *                              $ref: '#/components/schemas/ExerciseAttempt'
 *        "400":
 *          description: course Id might be invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: unauthorized (unauthenticated / can't access course or some exercise)
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.get('/exercise-summary',
    requireAuthentication,
    userInCourse,
    getExerciseSummary
)

/**
 * @swagger
 * path:
 *  /course/:courseId:
 *    delete:
 *      summary: >
 *        Deletes the course with given Id and all content that only this
 *        course references. Also deletes references to this course for its members
 *      description: >
 *        Deletes the course with given Id. All the members of this course
 *        have the references to this course removed from their
 *        enrolled, teacher and subscribed courses lists. If the course
 *        contained any content (exercises/entries/forums) that existed
 *        only and specifically in this course, also delete the documents
 *        of these pieces of content and clean up refs to the as well.
 *      operationId: deleteCourse
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
 *          description: Course has been deleted successfully
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
 *          description: unauthorized (unauthenticated / not the course's creator)
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.delete('/',
    requireAuthentication,
    isCourseCreator,
    removeCourseMentions,
    deleteCourse
);

/**
 * @swagger
 * path:
 *  /course/:courseId:
 *    put:
 *      summary: >
 *        Updates the course with the given ID and sets new course data for it,
 *        which is provided in the request body
 *      description: >
 *        Updates the course with the given ID and sets new course data for it,
 *        which is provided in the request body
 *        The request body should be
 *        [FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData).
 *        Only the `name`, `about`, `type`, `hasPassword`, `password`, `updates`,
 *        `sections` and `exercises` fields can be updated explicitly via this endpoint
 *        (`hashed_password` and `salt` gets updates implicitly via setting `password`)
 *        To update `sections` or `exercises`, please provide the complete
 *        list of sections/exercises that should be set as new ones, i.e. it should be
 *        distinguishable which exercises/entries have been deleted and which ones
 *        should be created after calling this endpoint. The old data gets completely
 *        replaced with the one that was received via this request and the new data
 *        gets compared to the previous one to perform cleanup and DB restructuring.
 *        NOTE: all operations while updating the course are performed
 *        on a MongoDB transaction, which gets initialized upon
 *        extracting the new course data from the received raw FormData
 *      operationId: updateUser
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
 *          application/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                course:
 *                  - $ref: '#/components/schemas/Course'
 *                files:
 *                  type: array
 *                  items:
 *                    type: string
 *                    format: binary
 *      responses:
 *        "200":
 *          description: >
 *            Course data has been updated successfully.
 *            Return the updated course data as JSON
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  user:
 *                    $ref: '#/components/schemas/Course'
 *                  message:
 *                    type: string
 *        "400":
 *          description: The provided data or courseId is invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: >
 *            Not authorized to update the course or the user doesn't
 *            have access to some course content they tried to change
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *
 *        "404":
 *          description: >
 *            Course with given ID could not be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.put('/',
    requireAuthentication,
    isTeacher,
    teacherInCourse,
    uploadFiles,
    initCourseEditing,
    cleanupCourseData,
    addUpdatesToCourse,
    updateCourseSections,
    updateCourseExercises,
    mergeCourseBasicFields,
    deleteFiles,
    saveCourseChanges,
)


//TODO add a getter for a single course (GET /course/:courseId/)


module.exports = router;