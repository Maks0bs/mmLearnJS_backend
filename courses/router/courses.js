let {
    requireAuthentication, isTeacher
} = require('../../users/controllers')

let {
    getCoursesFiltered, createCourse
} = require('../controllers')

/**
 * @swagger
 * tags:
 *   name: /courses/...
 *   description: >
 *     All endpoints connected to retrieving data about a group of courses
 */
let router = require('express').Router()

/**
 * @swagger
 * path:
 *  /courses/create:
 *    post:
 *      summary: >
 *        creates a new course with the given type and name.
 *        If the `hasPassword` attribute is true, the course password should
 *        be provided as well. See [course schema](#/components/schemas/Course) for details
 *      operationId: createCourse
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/courses/..."
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - name
 *                - type
 *                - password
 *              properties:
 *                name:
 *                  type: string
 *                about:
 *                  type: string
 *                type:
 *                  type: string
 *                  enum: [open, public, hidden]
 *                hasPassword:
 *                  type: boolean
 *                password:
 *                  type: string
 *                  description: >
 *                    See [course schema](#/components/schemas/Course) for correct password pattern
 *      responses:
 *        "200":
 *          description: >
 *            Successfully created a new course. Respond with the course data
 *            and the confirmation message
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                  user:
 *                    $ref: '#/components/schemas/Course'
 *        "400":
 *          description: >
 *            Invalid data in the request.
 *            See [course schema](#/components/schemas/Course)
 *            for details about what course field values are valid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Not enough rights (not a teacher / not authenticated)
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/create',
    requireAuthentication,
    isTeacher,
    createCourse
);//TODO write tests for this

//TODO change of frontend
//TODO change to get with url params
//TODO specify that it doesn't provide exhaustive data about exercises
router.post('/', getCoursesFiltered)

module.exports = router;