let jwt = require('jsonwebtoken');
let User = require('../model');
let constants = require('../../constants');
let { handleError } = require('../../helpers')
let { JWT_SECRET } = constants.auth,
    { DEFAULT_COOKIE_OPTIONS, NO_ACTION_LOGOUT_TIME } = constants.client
/**
 * @class controllers.users.util
 */
/**
 * @type function
 * @throws 401
 * @description this middleware doesn't affect the flow of others if used once.
 * If the cookie with the authentication token is provided, adds the `auth` property
 * to the `req` object which contains exhaustive data about the authenticated user
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.util
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
 * @memberOf controllers.users.util
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
 * @throws 401
 * @description lets subsequent middleware be invoked if the user is authenticated.
 * Stops the middleware flow otherwise.
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.util
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
 * @memberOf controllers.users.util
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
 * @memberOf controllers.users.util
 */
const logout = (req, res) => {
    // no need for tests here, this endpoint always does the same harmless thing
    res.clearCookie('auth', {...DEFAULT_COOKIE_OPTIONS});
    return res.json({ message: 'logout successful'})
}
exports.logout = logout

/**
 * @type function
 * @throws 401
 * @description lets subsequent middleware be invoked only if the user is a teacher
 * Stops the middleware flow otherwise.
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.util
 */
const isTeacher = (req, res, next) => {
    if (req.auth.role !== 'teacher'){
        return res.status(401)
            .json({ status: 401, message: 'You are not a teacher'})
    }
    return next();
}
exports.isTeacher = isTeacher;

/**
 * @type function
 * @throws 401
 * @description lets subsequent middleware be invoked only if the user is a teacher
 * or a student at the provided course. Stops the middleware flow otherwise.
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {models.Course} [req.courseData]
 * @param {string} [req.userCourseStatus] - sets this param in the request object for next middleware;
 * can be either `"creator"`, `"teacher"`, `"enrolled"` or `"not enrolled"`
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.util
 */
const userInCourse = (req, res, next) => {
    let course = req.courseData;
    if (course.creator._id.equals(req.auth._id)){
        req.userCourseStatus = 'creator';
        return next();
    }
    for (let t of course.teachers){
        if (t._id.equals(req.auth._id)){
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
        error: {status: 401, message: `you don't have access to this course`}
    })
}
exports.userInCourse = userInCourse;

/**
 * @type function
 * @throws 401
 * @description lets subsequent middleware be invoked only if the authenticated user is a teacher
 * at the provided course. Stops the middleware flow otherwise.
 * Please prefer using {@link controllers.userInCourse this controller} instead of this one
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {models.Course} [req.courseData]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.util
 */
const teacherInCourse = (req, res, next) => {
    if (!req.courseData.teachers){
        return res.status(401).json({
            status: 401, message: 'No teachers in this course'
        })
    }
    let check = false;
    for (let t of req.courseData.teachers){
        if (t.equals(req.auth._id)){
            check = true;
            break;
        }
    }
    if (!check){
        return res.status(401).json({
            status: 401, message: 'You are not authorized to perform this action'
        })
    }
    return next();
}
exports.teacherInCourse = teacherInCourse;

/**
 * @type function
 * @throws 401
 * @description lets subsequent middleware be invoked only if the authenticated user is the creator
 * of the provided course. Stops the middleware flow otherwise.
 * Please prefer using {@link controllers.userInCourse this controller} instead of this one
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {models.Course} [req.courseData]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.util
 */
const isCourseCreator = (req, res, next) => {
    if (!req.courseData.creator._id.equals(req.auth._id)){
        res.status(401).json({
            error: { status: 401, message: 'you are not the creator of the course'}
        })
    }
    return next();
}
exports.isCourseCreator = isCourseCreator;