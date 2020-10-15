let {
    signup, activateAccount, signin, getAuthenticatedUser,
    requireAuthentication, logout, inviteSignup, sendActivationLink,
    forgotPassword, resetPassword, userDataValidator
} = require('../controllers');
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
 *      summary: Creates a new user if the data in the body is valid
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
 *                    See [User schema](#/components/schemas/User) for correct password pattern
 *                teacher:
 *                  type: boolean
 *                  description: >
 *                    provide this prop if you want to register an account
 *                    with the `teacher` role. If true, provide the
 *                    correct teacher password under the `teacherPassword` prop
 *                teacherPassword:
 *                  type: string
 *                  description: >
 *                    provide this password to register a teacher account.
 *                    FOR TESTING PURPOSES: currently `teacherPassword="testpass"`
 *      responses:
 *        "200":
 *          description: >
 *            Successfully created a new users. Email sent.
 *            Respond with the user's data and the confirmation
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                  user:
 *                    $ref: '#/components/schemas/User'
 *        "400":
 *          description: >
 *            Invalid data in the request.
 *            See [User schema](#/components/schemas/User)
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
 *  /auth/invite-signup/:inviteToken:
 *    post:
 *      summary: >
 *        Creates a new user if the data in the body and in the invitation token is correct.
 *        Sends an message to the user's email address which
 *        contains the token to activate their account
 *      operationId: inviteSignup
 *      tags:
 *        - "/auth/..."
 *      parameters:
 *        - name: inviteToken
 *          in: path
 *          description: >
 *            the token that contains
 *            encrypted user data
 *          required: true
 *          type: string
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - name
 *                - password
 *              properties:
 *                name:
 *                  type: string
 *                password:
 *                  type: string
 *                  description: >
 *                    See [User schema](#/components/schemas/User) for correct password pattern
 *                teacher:
 *                  type: boolean
 *                  description: >
 *                    provide this prop if you want to register
 *                    an account with the `teacher` role. If true, provide the correct teacher
 *                    password under the `teacherPassword` prop
 *                teacherPassword:
 *                  type: string
 *                  description: >
 *                    provide this password to register a teacher account.
 *                    FOR TESTING PURPOSES: currently `teacherPassword="testpass"`
 *      responses:
 *        "200":
 *          description: >
 *            Successfully created a new user. If the token contained any additional
 *            instructions, all of the necessary operations were executed. Email sent.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                  user:
 *                    $ref: '#/components/schemas/User'
 *        "400":
 *          description: >
 *            Invalid data in the request or in the token.
 *            See [User schema](#/components/schemas/User)
 *            for details about what users data should contain
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Wrong token or wrong teacher password
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
router.post('/invite-signup/:inviteToken',
    userDataValidator(null, 'name', 'password'),
    validate,
    inviteSignup
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
router.post('/signin', signin);

// no need to test it, it doesn't cause errors and always does the same thing,
// it has no special request properties
/**
 * @swagger
 * path:
 *  /auth/logout:
 *    get:
 *      summary: >
 *        Clears the cookie that is responsible for authenticating the user if it is present.
 *        This is necessary, because all cookies have the
 *        [HttpOnly](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies) property
 *      tags:
 *        - "/auth/..."
 *      operationId: logout
 *      responses:
 *        "200":
 *          description: Cookies cleared successfully
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 */
router.get('/logout', logout);

/**
 * @swagger
 * path:
 *  /auth/cur-user:
 *    get:
 *      summary: >
 *        Get the current authenticated, depending on the authentication
 *        token in the `auth` cookie
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/auth/..."
 *      operationId: getAuthenticatedUser
 *      responses:
 *        "200":
 *          description: >
 *            The authenticated user if the authorization cookie was present
 *            in the headers, `"Not authenticated"` otherwise
 *          content:
 *            application/json:
 *              schema:
 *                oneOf:
 *                  - $ref: '#/components/schemas/User'
 *                  - type: string
 */
router.get('/cur-user', getAuthenticatedUser);

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
 *      operationId: sendActivationLink
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
router.post('/send-activation',
    requireAuthentication,
    sendActivationLink
)

/**
 * @swagger
 * path:
 *  /auth/activate/:activationToken:
 *    get:
 *      summary: >
 *        Activates the user, who is encrypted in
 *        the token in the `activationToken` param
 *      tags:
 *        - "/auth/..."
 *      parameters:
 *        - name: activationToken
 *          in: path
 *          description: >
 *            the token that contains
 *            encrypted user data
 *          required: true
 *          type: string
 *      operationId: activateAccount
 *      responses:
 *        "200":
 *          description: >
 *            Successfully activated account if it is not activated.
 *            Do nothing if account was activated beforehand.
 *            If not activated before, remove a reminder /
 *            notification to activate the account for the user
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "401":
 *          description: The activation token is invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "404":
 *          description: User with given token could not be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.get('/activate/:activationToken', activateAccount);

/**
 * @swagger
 * path:
 *  /auth/forgot-password:
 *    post:
 *      summary: >
 *        Sends a message to the user's email address which contains
 *        instructions on how to reset their password
 *      tags:
 *        - "/auth/..."
 *      operationId: forgotPassword
 *      responses:
 *        "200":
 *          description: >
 *            Email with instructions sent to user
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "400":
 *          description: No email provided in request or any problems with request body
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "404":
 *          description: User with given email could not be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/forgot-password', forgotPassword)

/**
 * @swagger
 * path:
 *  /auth/reset-password/:resetToken:
 *    post:
 *      summary: >
 *        Sets a new password for the user, whose data is encrypted in the provided token
 *      tags:
 *        - "/auth/..."
 *      operationId: resetPassword
 *      parameters:
 *        - name: resetToken
 *          in: path
 *          description: >
 *            the token that contains
 *            encrypted user data
 *          required: true
 *          type: string
 *      responses:
 *        "200":
 *          description: >
 *            Password updated successfully
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "400":
 *          description: >
 *            New password is incorrect.
 *            See [User schema](#/components/schemas/User) for correct password pattern
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: Reset token is invalid
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "404":
 *          description: User with the email, provided in the token could not be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/reset-password/:resetToken',
    userDataValidator({password: 'newPassword'}, 'password'),
    validate,
    resetPassword
)

module.exports = router;