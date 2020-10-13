let {validate} = require("../../helpers");
let {
    requireAuthentication, getUser, userById, getUsersFiltered,
    updateUser, deserializeAndCleanUserData, isAuthenticatedUser, getUpdatesByDate,
    deleteUser, removeUserMentions
} = require('../controllers');
let {
    uploadFiles, deleteFiles
} = require('../../files/controllers')
let {userDataValidator} = require('../controllers/validators')

/**
 * @swagger
 * tags:
 *   name: /users/...
 *   description: >
 *     All routes and API endpoints that are related to users data.
 *     Here all CRUD operations on users can be performed and some
 *     special information about users can be queried
 */
let router = require('express').Router()

/**
 * @swagger
 * path:
 *  /users/updates-by-date:
 *    get:
 *      summary: >
 *        Fetches all course updates(news) for courses with provided IDs and
 *        for the specified time period
 *      operationId: getUpdatesByDate
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/users/..."
 *      parameters:
 *        - in: query
 *          name: courses
 *          description: >
 *            the list of course IDs for which the updates should be shown.
 *            The array of IDs is passed in the
 *            [default `req.query` notation](https://expressjs.com/de/api.html#req.query)
 *          required: true
 *          schema:
 *            type: array
 *            items:
 *              type: string
 *          example: ?courses=abababababababababababab&courses=cdcdcdcdcdcdcdcdcdcdcdcd
 *        - in: query
 *          name: dateFrom
 *          description: >
 *            The date from which the updates should be searched for (RFC 3339)
 *          required: true
 *          schema:
 *            type: string
 *            format: date
 *        - in: query
 *          name: dateTo
 *          description: >
 *            The date up to which the updates should be searched for (RFC 3339)
 *          required: true
 *          schema:
 *            type: string
 *            format: date
 *        - in: query
 *          name: starting
 *          description: >
 *            The first index of the update from the whole list of updates
 *            for the given time period that should be returned in the response
 *          required: true
 *          schema:
 *            type: integer
 *        - in: query
 *          name: cnt
 *          description: >
 *            The max amount of updates from the whole list of updates
 *            for the given time period that should be returned in the response
 *            (starting from the `query.starting` position)
 *          required: true
 *          schema:
 *            type: integer
 *      responses:
 *        "200":
 *          description: All updates have been sent
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "400":
 *          description: The provided query params are invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: >
 *            User is not authenticated
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "404":
 *          description: >
 *            No updates / courses found with given params
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.get('/updates-by-date',
    requireAuthentication,
    getUpdatesByDate
)

/**
 * @swagger
 * path:
 *  /users/:userId:
 *    get:
 *      summary: >
 *        Gets all the available data about the given user. If the wanted user
 *        is not equal to the authenticated one, we don't receive the fields,
 *        that the wanted user decided to hide
 *      operationId: getUserById
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/users/..."
 *      parameters:
 *        - name: userId
 *          in: path
 *          description: >
 *            the id of the wanted user
 *          required: true
 *          type: string
 *      responses:
 *        "200":
 *          description: >
 *            All the available data about the wanted user
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/User'
 *        "400":
 *          description: The provided ID is invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "404":
 *          description: User with the given Id could not be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.get('/:userId', getUser);

//TODO!!!!!!!!
router.get('/', getUsersFiltered)//TODO create basic functionality for this endpoint
//TODO!!!!!!!!

/**
 * @swagger
 * path:
 *  /users/:userId:
 *    put:
 *      summary: >
 *        Updates the user with the given ID (who should be equal to the authenticated user)
 *        and sets the user data, provided in the request body.
 *      description: >
 *        Updates the user with the given ID (who should be equal to the authenticated user)
 *        and sets the user data, provided in the request body.
 *        The request body should be [FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData).
 *        All new user data should be a stringified JSON in the `user` field of the request form data.
 *        !!!ALWAYS provide all editable fields, even if you don't want to change them.
 *        For example, if you want to ONLY update the `about` field, please
 *        send the new `about` content, but also send the old name, photo data (id or newly uploaded photo)
 *        and the list of hidden fields.
 *        If you want to update the user's photo, provide the new photo image file in the
 *        `files` form field (this image should be the only uploaded file)
 *        and set the `user.photo` value to the string `"new"`.
 *        If you wish to explicitly remove the avatar photo for the user,
 *        set `user.photo` to `null`.
 *        If you DO NOT want to reset the password, set `user.password` to a
 *        [falsy value](https://developer.mozilla.org/en-US/docs/Glossary/Falsy).
 *        Otherwise put the new password in the `user.password` form field; You also have to
 *        provide the old password under the `user.oldPassword` field.
 *      operationId: updateUser
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/users/..."
 *      parameters:
 *        - name: userId
 *          in: path
 *          description: >
 *            the id of the user to be updated
 *          required: true
 *          type: string
 *      requestBody:
 *        content:
 *          application/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                user:
 *                  allOf:
 *                    - type: object
 *                      properties:
 *                        oldPassword:
 *                          type: string
 *                    - $ref: '#/components/schemas/User'
 *                files:
 *                  type: array
 *                  items:
 *                    type: string
 *                    format: binary
 *      responses:
 *        "200":
 *          description: >
 *            User has been updates successfully. Return the updates user data
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  user:
 *                    $ref: '#/components/schemas/User'
 *                  message:
 *                    type: string
 *        "400":
 *          description: The provided data or userId is invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: >
 *            Not authorized to update the user or some
 *            special authorization data (like old password) is wrong
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *
 *        "404":
 *          description: >
 *            User with given ID could not be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.put('/:userId',
    requireAuthentication,
    isAuthenticatedUser,
    uploadFiles,
    deserializeAndCleanUserData,
    userDataValidator(null, 'name'),
    validate,
    deleteFiles,
    updateUser
);

/**
 * @swagger
 * path:
 *  /users/:userId:
 *    delete:
 *      summary: >
 *        Deletes the user with the given ID
 *      operationId: deleteUser
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/users/..."
 *      parameters:
 *        - name: userId
 *          in: path
 *          description: >
 *            the id of the user to be updated
 *          required: true
 *          type: string
 *      responses:
 *        "200":
 *          description: User has been deleted successfully
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "400":
 *          description: The provided userId is invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: >
 *            Not authorized to delete the user
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "404":
 *          description: >
 *            User with given ID could not be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.delete('/:userId',
    requireAuthentication,
    isAuthenticatedUser,
    removeUserMentions,
    deleteFiles,
    deleteUser
)

router.param('userId', userById);

module.exports = router;