let {
    requireAuthentication
} = require('../../users/controllers')
let {
    correctAttemptOwner, getAttempt, updateAttemptAnswers, finishAttempt,
} = require('../controllers')

/**
 * @swagger
 * tags:
 *   name: /exercise-attempt/...
 *   description: >
 *     All endpoints related to updating/fetching data from a single exercise
 */
let router = require('express').Router()

/**
 * @swagger
 * path:
 *  /exercise-attempt/:attemptId:
 *    get:
 *      summary: >
 *        Fetches all information about the exercise
 *        attempt with provided ID (including answers)
 *      operationId: getExerciseAttempt
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - name: attemptId
 *          in: path
 *          description: >
 *            the id of the attempt to perform operations with
 *          required: true
 *          type: string
 *      tags:
 *        - "/exercise-attempt/..."
 *      responses:
 *        "200":
 *          description: Send the attempt
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/ExerciseAttempt'
 *        "400":
 *          description: attempt ID might be invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Not authenticated / not allowed to access attempt data
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.get('/',
    requireAuthentication,
    correctAttemptOwner,
    getAttempt
)//TODO add tests for this

/**
 * @swagger
 * path:
 *  /exercise-attempt/:attemptId:
 *    put:
 *      summary: >
 *        Updates the attempt with given ID with the provided
 *        answers
 *      operationId: updateExerciseAttemptAnswers
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - name: attemptId
 *          in: path
 *          description: >
 *            the id of the attempt to perform operations with
 *          required: true
 *          type: string
 *      tags:
 *        - "/exercise-attempt/..."
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                anyOf:
 *                  - type: object
 *                    required:
 *                      - taskRef
 *                    properties:
 *                      taskRef:
 *                        oneOf:
 *                          - $ref: '#/components/schemas/ExerciseTask'
 *                          - $ref: '#/components/schemas/ObjectId'
 *                      score:
 *                        type: number
 *                  - type: object
 *                    properties:
 *                      value:
 *                        type: string
 *                  - type: object
 *                    properties:
 *                      values:
 *                        type: array
 *                        items:
 *                          type: string
 *      responses:
 *        "200":
 *          description: Send the attempt with updated answers
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/ExerciseAttempt'
 *        "400":
 *          description: Invalid answers data. See error message for details.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Not authenticated / not allowed to access attempt data
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "403":
 *          description: Attempt is already finished, cannot update it
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.put('/',
    requireAuthentication,
    correctAttemptOwner,
    updateAttemptAnswers
)//TODO add tests for this

/**
 * @swagger
 * path:
 *  /exercise-attempt/:attemptId/finish:
 *    post:
 *      summary: >
 *        Finishes the attempt with the given ID if the user
 *        is authorized. The response contains the updated in a
 *        finished state: with calculated score for answers
 *      operationId: finishExerciseAttempt
 *      security:
 *        - cookieAuth: []
 *      parameters:
 *        - name: attemptId
 *          in: path
 *          description: >
 *            the id of the attempt to perform operations with
 *          required: true
 *          type: string
 *      tags:
 *        - "/exercise-attempt/..."
 *      responses:
 *        "200":
 *          description: Send the attempt with calculated score
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/ExerciseAttempt'
 *        "400":
 *          description: attempt ID might be invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Not authenticated / not allowed to access attempt data
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/finish',
    requireAuthentication,
    correctAttemptOwner,
    finishAttempt
)//TODO add tests for this

module.exports = router;