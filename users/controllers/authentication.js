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
 * @throws 401, 403
 * @description Signs the user up via an invitation token which provides additional information
 * @param {e.Request} req
 * @param {object} req.params
 * @param {string} req.params.inviteToken
 * @param {e.Response} res
 * @memberOf controllers.users.auth
 */
const inviteSignup = (req, res) => {
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
                {$push: { invitedTeachers: user }},
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