let User = require('../model');
let { extend } = require('lodash');
let { ObjectId } = require('mongoose').Types;
const {handleError, deleteFilesAsyncIndependent} = require("../../helpers");
const CONSTANTS = {
	NON_UPDATABLE_USER_FIELDS: [
		'email', 'hashed_password', 'created', 'updated', 'salt', 'role', 'activated',
		'enrolledCourses', 'teacherCourses', 'subscribedCourses', 'notifications'
	],
	NON_AVAILABLE_USER_FIELDS: [
		'salt', 'hashed_password', 'notifications', 'subscribedCourses'
	]
}
exports.CONSTANTS = CONSTANTS;
/**
 * @class controllers.users.usersData
 */
/**
 * @type function
 * @throws 400, 404
 * @description works with the `:userId` param in the url. Adds all the user's data
 * whose Id is the provided parameter. Adds all user's data to the request object
 * under the `req.user` property
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {models.User} [req.user]
 * @param {e.Response} res
 * @param {function} next
 * @param {string} id - the id of the user that should be found and saved
 * @memberOf controllers.users.usersData
 */
const userById = (req, res, next, id) => {
	return User.findOne({_id: id})
		.populate('enrolledCourses', '_id name')
		.populate('teacherCourses', '_id name')
		.then(user => {
			if (!user) throw {
				status: 404, message: 'user with given ID not found'
			}
			req.user = user;
			return next();
		})
		.catch(err => handleError(err, res))
}
exports.userById = userById;

/**
 * @type function
 * @throws 404
 * @description returns the formatted user from the `req.user` object. Normally
 * works with the {@link controllers.users.usersData.userById userById} controller
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {models.User} [req.user]
 * @param {e.Response} res
 * @memberOf controllers.users.usersData
 */
const getUser = (req, res) => {
	if (!req.user){
		return res.status(404).json({
			error: { status: 404, message: 'user not found' }
		})
	}
	let user = req.user;
	// remove irrelevant data for the response
	for (let f of CONSTANTS.NON_AVAILABLE_USER_FIELDS){
		user[f] = undefined;
		delete user[f];
	}
	// if the wanted user is not the authenticated one, hide fields, which
	// the user we are looking for decided to hide from the public
	if (!req.auth || !user._id.equals(req.auth._id)){
		user.hideFields();
	}
	return res.json(user);
}
exports.getUser = getUser;

/**
 * @type function
 * @throws 400
 * @description extracts the new user data (that should be replaced instead of the old one)
 * from `req.body`. This middleware should only be invoked after the FormData-body has been
 * turned into an object, the fields of which are still stringified (normally after calling)
 * the {@link controllers.files.uploadFiles uploadFiles} controller
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {[]} [req.files]
 * @param {[]} [req.filesToDelete]
 * @param {models.User} [req.user]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.usersData
 */
const deserializeAndCleanUserData = (req, res, next) => {
	try { //deserialize
		req.body = JSON.parse(req.body.user);
	} catch (err) {
		deleteFilesAsyncIndependent(req.files);
		return handleError(err, res);
	}
	// Removing previous users avatar if new one gets uploaded
	// or user wants to explicitly delete their photo
	let filesToDelete = [];
	if (Array.isArray(req.files) && req.user.photo  &&
		( ( req.files[0] && req.body.photo === 'new') || (req.body.photo === null) )
	){
		filesToDelete.push(req.user.photo);
	}
	req.filesToDelete = filesToDelete;
	return next();
}
exports.deserializeAndCleanUserData = deserializeAndCleanUserData;

/**
 * @type function
 * @description updates the user, provided in the `req.user` object with the new data from the
 * request body. If the body was FormData, then this controller should only be called after
 * {@link controllers.users.usersData.deserializeAndCleanUserData deserialization}
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {models.User & {oldPassword: string}} [req.body]
 * @param {[]} [req.files]
 * @param {[]} [req.filesToDelete]
 * @param {models.User} [req.user]
 * @param {e.Response} res
 * @memberOf controllers.users.usersData
 */
const updateUser = (req, res) => {
	let newData = {...req.body};
	delete newData.password;
	delete newData.oldPassword
	// If new file is available, then user wants to change their avatar.
	if (req.files && req.files[0] && newData.photo === 'new'){
		if (req.files[0].contentType.substring(0, 5) !== 'image'){
			return res.status(400).json({
				error: {status: 400, message: 'Avatar should be an image'}
			})
		}
		newData.photo = ObjectId(req.files[0].id.toString());
	}
	// Update password only if the correct old password is provided
	if (req.body.password){
		if (req.user.checkCredentials(req.body.oldPassword)){
			newData.password = req.body.password;
		} else {
			return res.status(401).json({
				error:{ status: 401, message: 'old password is wrong'}
			})
		}
	}
	let newUser = req.user;
	newUser.updated = Date.now();
	// Don't allow changing fields, that are only updated via other API endpoints
	for (let f of CONSTANTS.NON_UPDATABLE_USER_FIELDS){
		newData[f] = undefined;
		delete newData[f];
	}
	// `name` should always remain a non-hidden field
	if (!Array.isArray(newData.hiddenFields) || newData.hiddenFields.includes('name')){
		return res.status(400).json({
			error:{
				status: 400,
				message: 'Cannot make name a hidden field'
			}
		})
	}
	try {
		extend(newUser, newData);
	} catch (err){
		return handleError(err, res);
	}
	return newUser.save()
		.then(updatedUser => res.json(
			{ user: updatedUser, message: 'User updated successfully'})
		)
		.catch(err => handleError(err, res))
}
exports.updateUser = updateUser;

/**
 * @type function
 * @throws 401
 * @description lets subsequent middleware be invoked only if the authenticated user is equal
 * to the user who was found by id with the {@link controllers.users.usersData.userById} and
 * is present in the `req.user` object
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {models.User} [req.user]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.usersData
 */
const isAuthenticatedUser = (req, res, next) => {
	if (!req.auth._id.equals(req.user._id)){
		return res.status(401).json({
			error: {
				status: 401, message: 'Not authorized to perform operations to this user'
			}
		})
	}
	return next();
}
exports.isAuthenticatedUser = isAuthenticatedUser;

/**
 * @type function
 * @description deletes the user, specified in `req.user`
 * @param {e.Request} req
 * @param {models.User} req.user
 * @param {e.Response} res
 * @memberOf controllers.users.usersData
 */
const deleteUser = (req, res) => {
	return User.deleteOne({ _id: req.user._id})
		.then(() =>
			res.json({ message: 'user deleted successfully'})
		)
		.catch(err => handleError(err, res))
}
exports.deleteUser = deleteUser;