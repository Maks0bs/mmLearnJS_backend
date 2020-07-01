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