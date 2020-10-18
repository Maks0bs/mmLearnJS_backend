let jwt = require('jsonwebtoken');
let User = require('../model');
let { sendEmail, handleError } = require('../../helpers');
let constants = require('../../constants');
let { JWT_SECRET } = constants.auth,
    { CLIENT_URL } = constants.client,
    { ACTIVATION_TIME_PERIOD } = constants.users,
    { ACTIVATE_ACCOUNT } = constants.notifications
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
 * @throws 403
 * @description Sends the account activation link to the authenticated user's email
 * if their account is not yet activated
 * @param {e.Request} req
 * @param {models.User} req.auth
 * @param {e.Response} res
 * @memberOf controllers.users.auth
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
 * @throws 400, 404
 * @description Signs the user up via an invitation token which provides additional information
 * @param {e.Request} req
 * @param {Object} req.body
 * @param {string} req.body.email
 * @param {e.Response} res
 * @memberOf controllers.users.auth
 */
const forgotPassword = (req, res) => {
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