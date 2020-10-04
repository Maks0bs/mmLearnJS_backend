let {validate} = require("../../helpers");
let {
    requireAuthentication, getUser, userById, addNotifications, getUsersFiltered,
    updateUser, deserializeAndCleanData, isAuthenticatedUser, getUpdatesByDate,
    deleteUser, removeUserMentions
} = require('../controllers');
let {
    uploadFiles, deleteFiles
} = require('../../files/controller')
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
 *  /users/:userId:
 *    get:
 *      summary: >
 *        Gets all the available data about the given user. If the wanted user
 *        is not equal to the authenticated one, we don't receive the fields,
 *        that the wanted user decided to hide
 *      operationId: getUserById
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
 *        "404":
 *          description: User with the given Id could not be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.get('/:userId', getUser);//TODO add tests for this

router.get('/', getUsersFiltered)

//router.POST('/notifications/', addNotifications);
router.post('/filter', getUsersFiltered);

router.put('/:userId',
    requireAuthentication,
    isAuthenticatedUser,
    uploadFiles,
    deserializeAndCleanData,
    userDataValidator(null, 'name', 'email', 'password'),//TODO add more validators for each user field
    validate,
    deleteFiles,
    updateUser
);
router.delete('/:userId',
    requireAuthentication,
    isAuthenticatedUser,
    removeUserMentions,
    deleteFiles,
    deleteUser
)
router.post('/updates-by-date',
    requireAuthentication,
    getUpdatesByDate
)

router.param('userId', userById);

module.exports = router;