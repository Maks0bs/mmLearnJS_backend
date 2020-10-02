let jwt = require('jsonwebtoken');
let User = require('../model');
let constants = require('../../constants');
let { handleError } = require('../../helpers')
let { JWT_SECRET } = constants.auth,
    { DEFAULT_COOKIE_OPTIONS, NO_ACTION_LOGOUT_TIME } = constants.client

/**
 * @type function
 * @description this middleware doesn't affect the flow of others if used once.
 * If the cookie with the authentication token is provided, adds the `auth` property
 * to the `req` object which contains exhaustive data about the authenticated user
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers
 */
const authenticate = async (req, res, next) => {
    if (req.auth){
        return res.status(401).json({
            error: {
                status: 401,
                message:
                    'authenticated user is defined before extracting ' +
                    'data about them from the cookies'
            }
        })
    }
    let token = req.cookies['auth']
    if (!token){
        return next();
    }
    let userData = undefined;
    try {
        userData = jwt.verify(token, JWT_SECRET);
        delete userData.iat;
        req.auth = await User.findOne({_id: userData._id})
        return next();
    }
    catch(err) {
        console.log(err);
        return next();
    }
}
exports.authenticate = authenticate

/**
 * @type function
 * @description if the user was authenticated via {@link authenticate}, set the new
 * authentication cookie for the user to allow them use the site longer
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers
 */
const extendSession = (req, res, next) => {
    if (!req.auth){
        return next()
    }
    try {
        let { _id, role, email} = req.auth;
        let updatedToken = jwt.sign(
            { _id, role, email }, JWT_SECRET
        );
        res.cookie(
            'auth',
            updatedToken,
            {
                ...DEFAULT_COOKIE_OPTIONS,
                maxAge: NO_ACTION_LOGOUT_TIME
            }
        )
        return next()
    }
    catch (err) {
        console.log(err);
        return next()
    }
}
exports.extendSession = extendSession;
/**
 * @type function
 * @description lets subsequent middleware be invoked if the user is authenticated.
 * Stops the middleware flow otherwise.
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers
 */
const requireAuthentication = (req, res, next) => {
    if (!req.auth){
        return res.status(401).json({
            error: { status: 401, message: 'Unauthorized' }
        })
    }
    return next();
}
exports.requireAuthentication = requireAuthentication

/**
 * @type function
 * @description lets subsequent middleware be invoked if the user is authenticated
 * @param {e.Request} req
 * @param {models.User} req.auth
 * @param {e.Response} res
 * @memberOf controllers
 */
const getAuthenticatedUser = (req, res) => {
    if (!req.auth){
        return res.json("Not authenticated");
    }
    return User.findOne({ _id: req.auth._id })
        .select('-salt -hashed_password')
        .populate('subscribedCourses.course', '_id name')
        .then(user => res.json(user))
        .catch(err => handleError(err, res));
}
exports.getAuthenticatedUser = getAuthenticatedUser;
/**
 * @type function
 * @description Clears the cookie that is responsible for authenticating the user.
 * This is necessary, because all cookies have the
 * [HttpOnly](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies) property
 * @param {e.Request} req
 * @param {e.Response} res
 * @memberOf controllers
 */
const logout = (req, res) => {
    res.clearCookie('auth', {...DEFAULT_COOKIE_OPTIONS});
    return res.json({ message: 'logout successful'})
}
exports.logout = logout

exports.isCourseTeacher = (req, res, next) => {
    if (req.auth.role !== 'teacher'){
        return res.status(401)
            .json({ status: 401, message: 'You are not a teacher'})
    }
    return next();
}

exports.userInCourse = (req, res, next) => {
    let course = req.courseData;
    if (course.creator._id.equals(req.auth._id)){
        req.userCourseStatus = 'creator';
        return next();
    }
    for (let i of course.teachers){
        if (i._id.equals(req.auth._id)){
            req.userCourseStatus = 'teacher';
            return next();
        }
    }
    for (let i of course.students){
        if (i._id.equals(req.auth._id)){
            req.userCourseStatus = 'student';
            return next();
        }
    }

    req.userCourseStatus = 'not enrolled';

    return res.status(401).json({
        error: {
            status: 401,
            message: `you don't have access to this course`
        }
    })


}

exports.teacherInCourse = (req, res, next) => {
    if (!req.courseData.teachers){
        return res.status(401).json({
            message: 'No teachers in this course'
        })
    }

    let check = false;

    for (let i of req.courseData.teachers){
        if (i.equals(req.auth._id)){
            check = true;
            break;
        }
    }

    if (!check){
        return res.status(401).json({
            message: 'You are not authorized to perform this action'
        })
    }

    return next();
}

exports.isCourseCreator = (req, res, next) => {
    if (!req.courseData.creator._id.equals(req.auth._id)){
        res.status(401).json({
            error: {
                status: 401,
                message: 'you are not the creator of the course'
            }
        })
    }
    else{
        next();
    }
}

