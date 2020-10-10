const nodeMailer = require('nodemailer');
let { validationResult } = require('express-validator');
let { gmailClientCredentials } = require('../constants').mail

/**
 * @namespace helpers
 */
/**
 * @class controllers.helpers
 */
//TODO maybe put some common controllers
// (like authenticate, extendSession) to the `controllers.helpers` namespace
/**
 * @param {object} emailData
 * @param {string} emailData.from
 * @param {string} emailData.to
 * @param {string} emailData.text
 * @param {string} [emailData.html]
 * @return {Promise<string>}
 * @memberOf helpers
 */
const sendEmail = emailData => {

    const transporter = nodeMailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: gmailClientCredentials
    });
    return new Promise((resolve, reject) => {
        transporter
            .sendMail(emailData, (err, info) => {
                if (err){
                    console.log(`Problem sending email: ${JSON.stringify(err)}`)
                    reject(err);
                } else {
                    console.log(`Message sent: ${info.response}`);
                    resolve(`Email sent: ${info.response}`);
                }
            })
    })
};
exports.sendEmail = sendEmail;

/**
 * @type function
 * @throws 400
 * @description this controller should be used at the end of a chain of
 * {@link https://express-validator.github.io/docs/index.html express validators}, which are
 * defined in the `validators.js` file, for example {@link controllers.userDataValidator this one}
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.helpers
 */
const validate = (req, res, next) => {
    let { errors } = validationResult(req);
    if (errors.length > 0){
        let firstError = errors.map((error) => error.msg)[0];
        return res.status(400).json({
            error: { status: 400, message: firstError}
        })
    }
    return next();
}
exports.validate = validate;

/**
 * @description finished the middleware invocation and sends an error to the client.
 * By default the `error` object has 2 keys: `status` and `message`. Customize
 * it with the `option` param. Recommended to be put in `.catch()` expression after
 * some `.then()` promise handlers
 * @throws any error, specified in `err.status`
 * @param {any} err
 * @param {e.Response} res
 * @param {Object} [options] - specify here how the given error is structured
 * @memberOf helpers
 */
const handleError = (err, res, options) => {
    console.log(err);
    return res.status(err.status || 400)
        .json({
            error: {
                message: err.message || err,
                status: err.status || 400
            }
        })
}
exports.handleError = handleError;

/**
 * @deprecated
 * @param err the error object of mongoose error data (contains errors array and _message)
 * @return falsy value if err is not a valid mongoose error data object,
 * otherwise return the message of the first error
 * @memberOf helpers
 */
const formatMongooseError = (err) => {
    if (!err.errors){
        return 'Error';
    }
    let errorsValues = Object.keys(err.errors);
    let firstError = err.errors[errorsValues[0]];
    if (!firstError.properties){
        return 'Error';
    }
    let message = firstError.properties.message
    if ( ((typeof message) === 'object') || (message instanceof Object)){
        return JSON.stringify(message);
    } else if ( ((typeof message) === 'string') || (message instanceof String)){
        return {
            message,
            path: firstError
        };
    } else {
        return false;
    }
}
exports.formatMongooseError = formatMongooseError;