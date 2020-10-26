let {
    requireAuthentication
} = require('../../users/controllers')

let {
    getExerciseAttempts, newExerciseAttempt, getFormattedExercises,
    configureFormatSingleExercise, sendSingleExercise, userInExercise
} = require('../controllers')

/**
 * @swagger
 * tags:
 *   name: /exercise/...
 *   description: >
 *     All endpoints related to updating/fetching data from a single exercise
 */
let router = require('express').Router()

/**
 * @swagger
 * path:
 *  /exercise/:exerciseId/user-attempts:
 *    get:
 *      summary: >
 *        Returns detailed information about all the attempts that user made
 *        in the exercise with provided ID.
 *      description: >
 *        Returns detailed information about all the attempts that user made
 *        in the exercise with provided ID. The data about attempts contains all
 *        information about how the student answered each of the tasks in the exercise
 *      operationId: getExerciseUserAttempts
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - name: exerciseId
 *          in: path
 *          description: >
 *            the id of the exercise to perform operations with
 *          required: true
 *          type: string
 *      tags:
 *        - "/exercise/..."
 *      responses:
 *        "200":
 *          description: Send data about attempts
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/ExerciseAttempt'
 *        "400":
 *          description: exercise Id might be invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Not authenticated / not allowed to view exercise
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "403":
 *          description: Teachers cannot have any attempts
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.get('/user-attempts',
    requireAuthentication,
    userInExercise,
    getExerciseAttempts
);//TODO add tests for this

/**
 * @swagger
 * path:
 *  /exercise/:exerciseId:
 *    get:
 *      summary: >
 *        Returns all information about the exercise with given ID which is
 *        available to the authenticated user.
 *      description: >
 *        If the `courseRef` query param is not provided or the authenticated user
 *        is a student, then info about exercise participants is not sent.
 *        If the ref to course is provided and the authenticated user is a teacher
 *        that the response contains only participants that are members of the
 *        course with ID equal to `courseRef`-param value. Info about exercise
 *        tasks is always provided to teachers. Students can view exercise tasks
 *        only if they have a running attempt at this exercise
 *      operationId: getExercise
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - name: exerciseId
 *          in: path
 *          description: >
 *            the id of the exercise to perform operations with
 *          required: true
 *          type: string
 *        - name: courseRef
 *          in: query
 *          description: >
 *            Only relevant data will provided from the
 *            perspective of a member of the course with this ID.
 *            If not provided, info about participants cannot be accessed
 *          type: string
 *      tags:
 *        - "/exercise/..."
 *      responses:
 *        "200":
 *          description: Send exercise data
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Exercise'
 *        "400":
 *          description: exercise or course ID might be invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Not authenticated / not allowed to view exercise
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "404":
 *          description: Course with id from provided query cannot be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.get('/',
    requireAuthentication,
    userInExercise,
    configureFormatSingleExercise,
    getFormattedExercises,
    sendSingleExercise
)//TODO add tests for this

/**
 * @swagger
 * path:
 *  /exercise/:exerciseId/new-attempt:
 *    post:
 *      summary: >
 *        Creates a new attempt for the authenticated user
 *        to participate in the exercise with given ID
 *      operationId: newExerciseAttempt
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - name: exerciseId
 *          in: path
 *          description: >
 *            the id of the exercise to perform operations with
 *          required: true
 *          type: string
 *      tags:
 *        - "/exercise/..."
 *      responses:
 *        "200":
 *          description: Send the newly created attempt
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/ExerciseAttempt'
 *        "400":
 *          description: exercise ID might be invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Not authenticated / not allowed to view exercise
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "403":
 *          description: >
 *            Teachers can't create attempts / students can't create attempts
 *            if they have another running
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/new-attempt',
    requireAuthentication,
    userInExercise,
    newExerciseAttempt
)//TODO add tests for this

module.exports = router;