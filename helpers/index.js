const nodeMailer = require('nodemailer');
let { validationResult } = require('express-validator');
let { gmailClientCredentials } = require('../constants').mail

/**
 * @param {object} emailData
 * @param {string} emailData.from
 * @param {string} emailData.to
 * @param {string} emailData.text
 * @param {string} [emailData.html]
 * @return {Promise<string>}
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
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers
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
 * it with the `option` param.
 * @param {any} err
 * @param {e.Response} res
 * @param {Object} [options] - specify here how the given error is structured
 */
const handleError = (err, res, options) => {
    return res.status(err.status || 400)
        .json({
            error: {
                message: err.message,
                status: err.status
            }
        })
}
exports.handleError = handleError;

/**
 * @param err the error object of mongoose error data (contains errors array and _message)
 * @return falsy value if err is not a valid mongoose error data object,
 * otherwise return the message of the first error
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