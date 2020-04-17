let Course = require('../courses/model')
let User = require('./model');
let _ = require('lodash');
let mongoose = require('mongoose');

exports.userById = (req, res, next, id) => {
	User.findOne({_id: id})
	.then(user => {
		if (!user) throw {
			status: 404,
			error: 'user not found'
		}

		user.salt = undefined;
		user.hashed_password = undefined;

		req.user = user;//may need to change req.user to req.userById to avoid conflicts
		next();
	})
	.catch(err => {
		console.log(err);
		return res.status(err.status || 400)
			.json({
				error: err
			})
	}) 
}

exports.getUser = (req, res) => {
	if (!req.user){
		res.status(404).json({
			error: {
				status: 404,
				message: 'user not found'
			}
		})
	}
	let user = req.user;
	if (!req.auth || !user._id.equals(req.auth._id)){
		user.email = undefined;
		user.updated = undefined;
		user.activated = undefined;
		user.enrolledCourses = undefined;
		user.teacherCourses = undefined;
	}
	return res.json(user);
}