let { Course } = require('../courses/model')
let User = require('./model');
let _ = require('lodash');
let mongoose = require('mongoose');

exports.userById = (req, res, next, id) => {
	User.findOne({_id: id})
		.populate('enrolledCourses', '_id name')
		.populate('teacherCourses', '_id name')
		.then(user => {
			if (!user) throw {
				status: 404,
				error: 'user not found'
			}

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


	user.salt = undefined;
	user.hashed_password = undefined;

	// TODO if user != auth user then hide hiddenFields, specified in user object
	if (!req.auth || !user._id.equals(req.auth._id)){
		user.hideFields();
	}
	return res.json(user);
}

exports.getUsersFiltered = (req, res) => {

}

exports.isAuthenticatedUser = (req, res, next) => {
	if (!req.auth._id.equals(req.user._id)){
		return res.status(401)
			.json({
				message: 'You cannot perform this action, log in as the correct user'
			})
	}

	next();
}

exports.addNotifications = (req, res, next) => {
	// req.notificationsToAdd: {data: [array of notifications], user: _id}
	let notifications = req.notificationsToAdd.data;
	let user = req.notificationsToAdd.user;
	User.findByIdAndUpdate(
		user,
		{
			$push: {
				notifications: {
					$each: notifications
				}
			}
		},
		{ new: true }
	)
	.then(user => {
		return next();
	})
	.catch(err => {
		console.log(err);
		return res.status(err.status || 400)
			.json({
				error: err
			})
	}) 
}


exports.deserializeAndCleanData = (req, res, next) => {
	req.newUserData = JSON.parse(req.body.newUserData);

	/**
	 * Removing previous user avatar if new one gets uploaded
	 */
	let filesToDelete = [];
	if (req.files && req.files[0] && req.user.photo){
		filesToDelete.push(req.user.photo);
	}

	req.filesToDelete = filesToDelete;

	next();
}

exports.updateUser = (req, res) => {
	let newData = {
		...req.newUserData,
		newPassword: undefined,
		oldPassword: undefined
	};

	/**
	 * If new file is available, then user wants to change their avatar.
	 */
	if (req.files && req.files[0]){
		newData.photo = mongoose.Types.ObjectId(req.files[0].id.toString());
	}

	/**
	 * Check if given password is equal to current one and set new password only in this case
	 */
	if (req.newUserData.newPassword){
		if (req.user.checkCredentials(req.newUserData.oldPassword)){
			newData.password = req.newUserData.newPassword;
		} else {
			return res.status(401).json({
				error:{
					status: 401,
					message: 'old password is wrong'
				}
			})
		}
	}

	let newUser = req.user;
	_.extend(newUser, newData);
	newUser.updated = Date.now();

	newUser.save()
		.then((result) => {
			return res.json({
				message: 'user updated successfully'
			})
		})
		.catch(err => {
			console.log(err);
			return res.status(err.status || 400)
				.json({
					error: err
				})
		})

}

exports.getUpdatesByDate = (req, res) => {
	let subscribedIds = req.body.courses;
	Course.find({
		_id: {
			$in: subscribedIds
		}
	})
		.then((courses) => {
			let preUpdates = [];
			let from = new Date(req.body.dateFrom);
			let to = new Date(req.body.dateTo);
			to.setDate(to.getDate() + 1);
			for (let c of courses){
				for (let u of c.updates){
					if (u.created >= from && u.created <= to){
						preUpdates.push({
							data: u,
							course: {
								name: c.name,
								id: c._id
							}
						});
					}
				}
			}


			preUpdates.sort((a, b) => {
				return b.data.created - a.data.created;
			})


			console.log(req.body);

			let updates = [];
			for (let i = req.body.starting;
				 i < _.min([req.body.starting + req.body.cnt, preUpdates.length]);
				 i++
			){
				updates.push(preUpdates[i]);
			}


			return res.json(updates);
		})
}
