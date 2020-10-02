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
 * @description creates a new user with properties, given in the `req.body`
 * See {@link models.User} for details on this props.
 * @param {e.Request} req
 * @param {SignupData|any} req.body
 * @param {e.Response} res
 * @memberOf controllers
 */
const signup = (req, res) => {
    return User.findOne({ email: req.body.email })
        .then(  user => {
            // users with the given email already exists
            if (user) throw {
                status: 403, message: 'Email is taken'
            }
            if (req.body.teacher && req.body.teacherPassword === TEACHER_PASSWORD){
                req.body.role = 'teacher'
            } else if (req.body.teacher) throw {
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
            let token = jwt.sign(
                { _id: user._id, email: user.email},
                JWT_SECRET,
                { expiresIn: ACTIVATION_TIME_PERIOD }
            )
            req.emailData = { email: user.email, token: token }
            return user.save()
        })
        .then( /** @param {models.User & any} user*/user => {
            req.newUser = user;
            return sendEmail({
                from: "noreply@mmlearnjs.com",
                to: req.emailData.email,
                subject: "Account activation instructions",
                text:
                    `Please use the following link to activate your account: ` +
                    `${CLIENT_URL}/activate-account/${req.emailData.token}`,
                html: `
                    <p> Please use the following link to activate your account: </p> 
                    <p> ${CLIENT_URL}/activate-account/${req.emailData.token} </p>
                `
            })
        })
        .then(() => {
            res.json({
                message: `Signup success for user ${req.body.email}. Please check email for activation`,
                user: req.newUser
            })
        })
        .catch(err => {handleError(err, res)})

}
exports.signup = signup
/**
 * @type function
 * @description authenticates the user, sending a cookie with the
 * token for authorization
 * @param {e.Request} req
 * @param {BasicAuthUserData} req.body
 * @param {e.Response} res
 * @memberOf controllers
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
 * @description Sends the account activation link to the authenticated user's email
 * if their account is not yet activated
 * @param {e.Request} req
 * @param {models.User} req.auth
 * @param {e.Response} res
 * @memberOf controllers
 */
const sendActivationLink = (req, res) => {
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
 * @description Activates the account
 * @param {e.Request} req
 * @param {object} req.params
 * @param {string} req.params.activationToken
 * @param {e.Response} res
 * @memberOf controllers
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
 * @description Signs the user up via an invitation token which provides additional information
 * @param {e.Request} req
 * @param {object} req.params
 * @param {string} req.params.inviteToken
 * @param {e.Response} res
 * @memberOf controllers
 */
const inviteSignup = (req, res) => {
    //TODO add tests
    let inviteData = {}, emailData = {};
    try {
        inviteData = jwt.verify(req.params.inviteToken, JWT_SECRET)
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
    if (!inviteData.invited){
        return res.status(401).json({
            error: {
                status: 401,
                message: 'Wrong token. Possibly not meant for signup through invitation'
            }
        })
    }
    return User.findOne({ email: req.body.email })
        .then(user => {
            if (user) throw {
                status: 403,
                message: 'Email is taken'
            }
            if (inviteData.teacher ||
                (req.body.teacher && req.body.teacherPassword === TEACHER_PASSWORD)
            ){
                req.body.role = 'teacher'
            } else if (req.body.teacher && req.body.teacherPassword !== TEACHER_PASSWORD) throw {
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
            if ((typeof inviteData.courseId) === 'string'){
                user.addNotification({
                    type: COURSE_TEACHER_INVITATION,
                    title: 'You are invited to be a teacher',
                    text: `
                        The creator of the course "${inviteData.courseName || inviteData.courseId}" 
                        has invited you to be a teacher in their course. 
                        You can accept of decline this invitation
                    `
                })
            }
            let token = jwt.sign(
                { _id: user._id, email: user.email },
                JWT_SECRET,
                { expiresIn: ACTIVATION_TIME_PERIOD }
            )
            emailData = { email: user.email, token: token}
            return user.save()
        })
        .then(user => {
            req.newUser = user;
            if (!inviteData.courseId){
                return Promise.resolve(true);
            }
            return Course.findByIdAndUpdate(
                inviteData.courseId,
                {
                    $push: { invitedTeachers: user }
                },
                { new: true }
            )
        })
        .then(() => {
            return sendEmail({
                from: "noreply@mmlearnjs.com",
                to: emailData.email,
                subject: "Account activation instructions",
                text: `
                    Please use the following link to activate your account: 
                    ${CLIENT_URL}/activate-account/${emailData.token}
                `,
                html: `
                    <p> Please use the following link to activate your account: </p> 
                    <p> ${CLIENT_URL}/activate-account/${emailData.token} </p>
                `
            });
        })
        .then(() => {
            res.json({
                message: `
                    Signup success for user ${req.body.email}. 
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
 * @description Signs the user up via an invitation token which provides additional information
 * @param {e.Request} req
 * @param {Object} req.body
 * @param {string} req.body.email
 * @param {e.Response} res
 * @memberOf controllers
 */
const forgotPassword = (req, res) => {
    //TODO add tests
    if (!req.body || !req.body.email)
        return res.status(400).json({
            error:{
                status: 400,
                message: "No Email is provided"
            }
        });
    let { email } = req.body;

    User.findOne({ email })
        .then(user => {
            if (!user)
                return res.status(404).json({
                    error: {
                        status: 404,
                        message: "User with that email does not exist!"
                    }
                });

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
 * @description Signs the user up via an invitation token which provides additional information
 * @param {e.Request} req
 * @param {Object} req.body
 * @param {string} req.body.newPassword
 * @param {Object} req.params
 * @param {string} req.params.resetToken
 * @param {e.Response} res
 * @memberOf controller
 */
const resetPassword = (req, res) => {
    //TODO add tests
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
    return User.findOne({email: data.email})
        .then(user => {
            if (!user) {
                return res.status(404).json({
                    error: {
                        status: 404, message: "No user found with the given token"
                    }
                });
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