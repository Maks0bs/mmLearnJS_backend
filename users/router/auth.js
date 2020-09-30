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
 *   name: /auth/...
 *   description: >
 *     All routes and API endpoints that are related to users
 *     authentication and authorization. These routes implicitly
 *     change/create the user's data. If the user is authenticated
 *     and sends their authorization token in the request cookies
 *     on any endpoint, mentioned in this section,
 *     the server extends their session (puts new session cookie to response headers)
 *     so that it would last 10 minutes, starting from the moment when the client
 *     receives the response. If no `auth` cookie is present, nothing happens.
 */

let router = require('express').Router()

/**
 * @swagger
 * path:
 *  /auth/signup:
 *    post:
 *      summary: Creates a new users if the data in the body is valid
 *      operationId: signup
 *      tags:
 *        - "/auth/..."
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
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "403":
 *          description: Given email is taken
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/signup',
    userDataValidator(null, 'name', 'password', 'email'),
    validate,
    signup
);

/**
 * @swagger
 * path:
 *  /auth/signin:
 *    post:
 *      summary: >
 *        Authenticates user, sending them a cookie in the HTTP header of the response.
 *        This cookie contains a [JWT](https://jwt.io) that has all necessary data to
 *        identify the user. This cookie should be sent back to the server
 *        every time an action with special authorization is required
 *        (e. g. enrolling in a course, changing user data)
 *      operationId: signin
 *      tags:
 *        - "/auth/..."
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - email
 *                - password
 *              properties:
 *                email:
 *                  type: string
 *                  format: email
 *                password:
 *                  type: string
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
 *          headers:
 *            Set-Cookie:
 *              description: >
 *                Contains the `auth` cookie with the authorization token.
 *                Pass this token in requests to get authorized
 *              schema:
 *                type: string
 *                example: auth=randomjwttoken; Path=/; HttpOnly Secure SameSite=None
 *        "400":
 *          description: User with given email doesn't exist
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Wrong password
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/signin', signin); //TODO add tests for this

/**
 * @swagger
 * path:
 *  /auth/send-activation:
 *    post:
 *      summary: >
 *        Sends the account activation link to the authenticated user's email
 *        if their account is not yet activated
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/auth/..."
 *      responses:
 *        "200":
 *          description: Activation link sent successfully
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "401":
 *          description: User is not authenticated
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "403":
 *          description: Account is already activated; No email was sent
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/send-activation', //TODO add tests for this
    requireAuthentication,
    sendActivationLink
)


router.post('/activate', activateAccount);
router.get('/cur-users', getAuthenticatedUser);
router.get('/logout', logout);
router.post('/invite-signup', inviteSignup);

router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

module.exports = router;