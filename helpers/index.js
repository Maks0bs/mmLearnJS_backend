const nodeMailer = require('nodemailer');
let {
    validationResult
} = require('express-validator');
 
exports.sendEmail = emailData => {
    const transporter = nodeMailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: "maksthebro173@gmail.com",
            pass: "pdkxgrrcdduoffjc"
        }
    });
    return (
        transporter
            .sendMail(emailData)
            .then(info => console.log(`Message sent: ${info.response}`))
            .catch(err => console.log(`Problem sending email: ${err}`))
    );
};

exports.validate = (req, res, next) => {
    let { errors } = validationResult(req);
    if (errors.length > 0){
        let firstError = errors.map((error) => error.msg)[0];
        return res.status(400).json({
            error: {
                status: 400,
                message: firstError
            }
        })
    }

    next();
}

/**
 *
 * @param err the error object of mongoose error data (contains errors array and _message)
 * @return falsy value if err is not a valid mongoose error data object,
 * otherwise return the message of the first error
 */
exports.formatMongooseError = (err) => {
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