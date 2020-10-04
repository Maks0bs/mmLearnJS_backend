let jwt = require('jsonwebtoken');
let User = require('../model');
let { Course } = require('../../courses/model');
let { sendEmail, handleError } = require('../../helpers');
let constants = require('../../constants');
let { JWT_SECRET } = constants.auth,
    { CLIENT_URL, DEFAULT_COOKIE_OPTIONS, NO_ACTION_LOGOUT_TIME } = constants.client,
    { TEACHER_PASSWORD, ACTIVATION_TIME_PERIOD } = constants.users,
    { ACTIVATE_ACCOUNT, COURSE_TEACHER_INVITATION } = constants.notifications
/**
 * @class controllers.users.auth
 */
/**
 * @typedef BasicAuthUserData
 * @type Object
 * @property {string} email
 * @property {string} password
 */
/**
 * @typedef SignupData
 * @type Object&BasicAuthUserData
 * @property {string} name
 * @property {boolean} [teacher]
 * @property {string} [teacherPassword]
 */
/**
 * @type function
 * @throws 401, 403
 * @description creates a new user with properties, given in the `req.body`
 * See {@link models.User} for details on this props.
 * @param {e.Request} req
 * @param {SignupData|any} req.body
 * @param {e.Response} res
 * @memberOf controllers.users.auth
 */
const signup = (req, res) => {
    // TODO add tests to check if email was sent
    let { email, teacher, teacherPassword } = req.body, token;
    return User.findOne({ email })
        .then(  user => {
            // users with the given email already exists
            if (user) throw {
                status: 403, message: 'Email is taken'
            }
            if (teacher && teacherPassword === TEACHER_PASSWORD){
                req.body.role = 'teacher'
            } else if (teacher) throw {
                status: 401, message: 'Wrong password for signing up as a teacher'
            }
            return new User(req.body)
        })
        .then( /** @param {models.User & any} user*/user => {
            user.addNotification({
                type: ACTIVATE_ACCOUNT,
                title: 'Activate your account',
                text: 'Please check your email to activate your account'
            })
            token = jwt.sign(
                { _id: user._id, email: user.email},
                JWT_SECRET,
                { expiresIn: ACTIVATION_TIME_PERIOD }
            )
            return user.save()
        })
        .then( /** @param {models.User & any} user*/user => {
            req.newUser = user;
            return sendEmail({
                from: "noreply@mmlearnjs.com",
                to: email,
                subject: "Account activation instructions",
                text:
                    `Please use the following link to activate your account: ` +
                    `${CLIENT_URL}/activate-account/${token}`,
                html: `
                    <p> Please use the following link to activate your account: </p> 
                    <p> ${CLIENT_URL}/activate-account/${token} </p>
                `
            })
        })
        .then(() => {
            res.json({
                message: `Signup success for user ${email}. Please check email for activation`,
                user: req.newUser
            })
        })
        .catch(err => {handleError(err, res)})

}
exports.signup = signup
/**
 * @type function
 * @throws 400, 401
 * @description authenticates the user, sending a cookie with the
 * token for authorization
 * @param {e.Request} req
 * @param {BasicAuthUserData} req.body
 * @param {e.Response} res
 * @memberOf controllers.users.auth
 */
const signin = (req, res) => {
    let { email, password } = req.body;
    return User.findOne({ email })
        .then(/** @type models.User */user => {
            if (!user) throw {
                status: 400,
                message: `User with that email doesn't exist`
            }
            if (!user.checkCredentials(password)) throw {
                status: 401,
                message: 'Wrong password for this users'
            }
            // don't include all user data (too much) to make the headers lighter
            let token = jwt.sign(
                {_id: user._id, role: user.role, email: user.email},
                JWT_SECRET
            )
            //attach cookie to headers
            res.cookie(
                'auth', token,
                {...DEFAULT_COOKIE_OPTIONS, maxAge: NO_ACTION_LOGOUT_TIME}
            );
            return res.json({
                message: `User ${user.email} signed in successfully`
            })
        })
        .catch(err => handleError(err, res))
};
exports.signin = signin;
/**
 * @type function
 * @throws 403
 * @description Sends the account activation link to the authenticated user's email
 * if their account is not yet activated
 * @param {e.Request} req
 * @param {models.User} req.auth
 * @param {e.Response} res
 * @memberOf controllers.users.auth
 */
const sendActivationLink = (req, res) => {
    // TODO add tests to check if email was sent
    if (req.auth.activated){
        return res.status(403).json({
            error: { status: 403, message: 'Your account is already activated'}
        })
    }
    let token = jwt.sign(
        { _id: req.auth._id, email: req.auth.email },
        JWT_SECRET,
        { expiresIn: ACTIVATION_TIME_PERIOD }
    )
    return sendEmail({
        from: "noreply@mmlearnjs.com",
        to: req.auth.email,
        subject: "Account activation instructions",
        text:
            `Please use the following link to activate your account: ` +
            `${CLIENT_URL}/activate-account/${token}`,
        html: `
            <p> Please use the following link to activate your account: </p> 
            <p> ${CLIENT_URL}/activate-account/${token} </p>
        `
    })
        .then(() => {
            return res.json({
                message: 'Activation link sent successfully'
            })
        })
        .catch(err => {handleError(err, res)})
}
exports.sendActivationLink = sendActivationLink

/**
 * @type function
 * @throws 401, 404
 * @description Activates the account
 * @param {e.Request} req
 * @param {object} req.params
 * @param {string} req.params.activationToken
 * @param {e.Response} res
 * @memberOf controllers.users.auth
 */
const activateAccount = (req, res) => {
    let token = req.params.activationToken, userData;
    try {
        userData = jwt.verify(token, JWT_SECRET)
    }
    catch (err) {
        return res.status(401).json({
            error: {
                status: 401,
                message: (err.name === 'TokenExpiredError') ?
                    'Activation link expired' :
                    `Activation token error: ${err.message || err.name}`
            }
        })
    }
    return User.findOne({ _id: userData._id, email: userData.email })
        .then(/** @type models.User & any */user => {
            if (!user) throw {
                status: 404,
                message: 'The user with the given token could not be found'
            }
            if (user.activated){
                return res.json({
                    message: `Account for user with email ${userData.email} is already activated`
                })
            }
            user.activated = true;
            //remove notifications that reminds the user to activate the account
            user.notifications =
                user.notifications.filter(n => n.type !== ACTIVATE_ACCOUNT);
            return user.save();
        })
        .then(() => {
            return res.json({
                message: `Account with email ${userData.email} successfully activated`
            })
        })
        .catch(err => handleError(err, res));
}
exports.activateAccount = activateAccount;

/**
 * @type function
 * @throws 401, 403
 * @description Signs the user up via an invitation token which provides additional information
 * @param {e.Request} req
 * @param {object} req.params
 * @param {string} req.params.inviteToken
 * @param {e.Response} res
 * @memberOf controllers.users.auth
 */
const inviteSignup = (req, res) => {
    // TODO add tests to check if email was sent
    let token, inviteData;
    try {
        inviteData = jwt.verify(req.params.inviteToken, JWT_SECRET);
        req.body = {...inviteData, ...req.body}
    }
    catch (err) {
        return res.status(401).json({
            error: {
                status: 401,
                message: (err.name === 'TokenExpiredError') ?
                    'Invite link expired' :
                    `Invite token error: ${err.message || err.name}`
            }
        })
    }
    let {
        courseId, email, teacher, teacherPassword, courseName, invited
    } = req.body;
    if (!invited){
        return res.status(401).json({
            error: {
                status: 401,
                message: 'Wrong token. Possibly not meant for signup through invitation'
            }
        })
    }
    return User.findOne({ email })
        .then(user => {
            if (user) throw {
                status: 403,
                message: 'Email is taken'
            }
            // it is important that inviteData.teacher is true, not req.body.teacher.
            // The second case this might enable creating teacher accounts
            // without providing the special teacher password
            if (inviteData.teacher || (teacher && teacherPassword === TEACHER_PASSWORD)){
                req.body.role = 'teacher'
            } else if (teacher && teacherPassword !== TEACHER_PASSWORD) throw {
                status: 401,
                message: 'Wrong teacher password'
            }
            return new User(req.body)
        })
        .then(/** @type models.User & any */user => {
            user.addNotification({
                type: ACTIVATE_ACCOUNT,
                title: 'Activate your account',
                text: 'Please check your email to activate your account'
            });
            // if they are invited to a certain course,
            // add a notification for new users to know
            if ((typeof courseId) === 'string'){
                user.addNotification({
                    type: COURSE_TEACHER_INVITATION,
                    title: 'You are invited to be a teacher',
                    text: `
                        The creator of the course "${courseName || courseId}" 
                        has invited you to be a teacher in their course. 
                        You can accept of decline this invitation
                    `
                })
            }
            token = jwt.sign(
                { _id: user._id, email: user.email },
                JWT_SECRET,
                { expiresIn: ACTIVATION_TIME_PERIOD }
            )
            return user.save()
        })
        .then(user => {
            req.newUser = user;
            if (!courseId){
                return Promise.resolve(true);
            }
            return Course.findByIdAndUpdate(
                courseId,
                {
                    $push: { invitedTeachers: user }
                },
                { new: true }
            )
        })
        .then(() => {
            return sendEmail({
                from: "noreply@mmlearnjs.com",
                to: email,
                subject: "Account activation instructions",
                text: `
                    Please use the following link to activate your account: 
                    ${CLIENT_URL}/activate-account/${token}
                `,
                html: `
                    <p> Please use the following link to activate your account: </p> 
                    <p> ${CLIENT_URL}/activate-account/${token} </p>
                `
            });
        })
        .then(() => {
            res.json({
                message: `
                    Signup success for user ${email}. 
                    Please check your email for activation
                `,
                user: req.newUser
            })
        })
        .catch(err => {handleError(err, res)});
}
exports.inviteSignup = inviteSignup;

/**
 * @type function
 * @throws 400, 404
 * @description Signs the user up via an invitation token which provides additional information
 * @param {e.Request} req
 * @param {Object} req.body
 * @param {string} req.body.email
 * @param {e.Response} res
 * @memberOf controllers.users.auth
 */
const forgotPassword = (req, res) => {
    // TODO add test to check if email was sent
    if (!req.body || !req.body.email)
        return res.status(400).json({
            error:{
                status: 400,
                message: "No Email is provided"
            }
        });
    let { email } = req.body;

    return User.findOne({ email })
        .then(user => {
            if (!user) throw {
                status: 404,
                message: "User with that email does not exist!"
            }

            let token = jwt.sign(
                { _id: user._id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn:  10 * 60 /*10 minutes*/}
            );

            let emailData = {
                from: "noreply@node-react.com",
                to: email,
                subject: "Password Reset Instructions",
                text: `Please use the following link to reset your password: ${CLIENT_URL}/reset-password/${token}`,
                html: `
                    <p>Please use the following link to reset your password:</p> 
                    <p>${CLIENT_URL}/reset-password/${token}</p>
                `
            };

            return sendEmail(emailData);
        })
        .then(() => {
            return res.json({
                message: `
                    Email has been sent to ${email}. 
                    Follow the instructions to reset your password.
                `
            });
        })
        .catch(err => handleError(err, res));
}
exports.forgotPassword = forgotPassword;

/**
 * @type function
 * @throws 401, 404
 * @description Signs the user up via an invitation token which provides additional information
 * @param {e.Request} req
 * @param {Object} req.body
 * @param {string} req.body.newPassword
 * @param {Object} req.params
 * @param {string} req.params.resetToken
 * @param {e.Response} res
 * @memberOf controllers.users.auth
 */
const resetPassword = (req, res) => {
    const token = req.params.resetToken;
    const {newPassword} = req.body;
    let data = {};
    try {
        data = jwt.verify(token, JWT_SECRET)
    } catch (err) {
        return res.status(401).json({
            error: {
                status: 401,
                message: (err.name === 'TokenExpiredError') ?
                    'Reset link expired' :
                    `Reset token error: ${err.message || err.name}`
            }
        })
    }
    let {_id, email, role} = data;
    return User.findOne({ _id, email, role})
        .then(user => {
            if (!user) throw {
                status: 404,
                message: "No user found with the given token"
            }
            user.password = newPassword;
            user.updated = Date.now();
            return user.save();
        })
        .then(() => {
            return res.json({
                message: `Great! Now you can login with your new password.`
            });
        })
        .catch(err => handleError(err, res));
}
exports.resetPassword = resetPassword;