let {
    signup, activateAccount, signin, getAuthenticatedUser,
    requireAuthentication, logout, inviteSignup, sendActivationLink,
    forgotPassword, resetPassword
} = require('../controllers');
let {userDataValidator} = require('../controllers/validators')
let {validate} = require('../../helpers')
/**
 * @swagger
 * tags:
 *   name: Authentication/Authorization
 *   description: >
 *     All routes and API endpoints that are related to users
 *     authentication and authorization. These routes implicitly
 *     change/create the users's data
 */

let router = require('express').Router()

/**
 * @swagger
 * path:
 *  /auth/signup:
 *    POST:
 *      summary: Creates a new users if the data in the body is valid
 *      operationId: signup
 *      tags: [Authentication]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - name
 *                - email
 *                - password
 *              properties:
 *                name:
 *                  type: string
 *                email:
 *                  type: string
 *                  format: email
 *                password:
 *                  type: string
 *                  description: >
 *                    See [User schema](#/components/schemas/ObjectId) for correct password pattern
 *                teacher:
 *                  type: boolean
 *                  description: >
 *                    provide this prop if you want to register an account with the `teacher` role.
 *                    If true, provide the correct teacher password under the `teacherPassword` prop
 *                teacherPassword:
 *                  type: string
 *                  description: >
 *                    provide this password to register a teacher account.
 *                    FOR TESTING PURPOSES: currently `teacherPassword="testpass"`
 *      responses:
 *        "200":
 *          description: Successfully created a new users. Send the users and the confirmation
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                  users:
 *                    $ref: '#/components/schemas/User'
 *        "400":
 *          description: >
 *            Invalid data in the request.
 *            See [User schema](#/components/schemas/ObjectId)
 *            for details about what users data should contain
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Wrong teacher password
 *        "403":
 *          description: Given email is taken
 */
router.post('/signup',
    userDataValidator(null, 'name', 'password', 'email'),
    validate,
    signup
);
router.post('/signin', signin);
router.post('/activate', activateAccount);
router.get('/cur-users', getAuthenticatedUser);
router.get('/logout', logout);
router.post('/invite-signup', inviteSignup);
router.post('/send-activation', requireAuthentication, sendActivationLink)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

module.exports = router;