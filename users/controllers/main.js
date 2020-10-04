let { Course } = require('../../courses/model')
let User = require('../model');
let _ = require('lodash');
let mongoose = require('mongoose');

exports.userById = (req, res, next, id) => {
	User.findOne({_id: id})
		.populate('enrolledCourses', '_id name')
		.populate('teacherCourses', '_id name')
		.then(user => {
			if (!user) throw {
				status: 404,
				error: {
					message: 'users not found'
				}
			}

			req.user = user;//may need to change req.users to req.userById to avoid conflicts
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
				message: 'users not found'
			}
		})
	}
	let user = req.user;


	user.salt = undefined;
	user.hashed_password = undefined;

	// TODO if users != auth users then hide hiddenFields, specified in users object
	if (!req.auth || !user._id.equals(req.auth._id)){
		user.hideFields();
	}
	return res.json(user);
}

exports.configUsersFilter = (req, res, next) => {
	req.usersFilter = req.query;
	return next();
}

//TODO if we find users by a certain param and this param is in the hiddenFields array, don't include this users
//TODO however still include, if they could be found by another param, which is not hidden
exports.getUsersFiltered = (req, res) => {
	let { usersFilter: filter } = req;
	return User.find({filter})
		.then((users) => (
			res.json(users)
		))
		.catch(err => {
			console.log(err);
			return res.status(err.status || 400)
				.json({
					error: err
				})
		})
}

exports.isAuthenticatedUser = (req, res, next) => {
	if (!req.auth._id.equals(req.user._id)){
		return res.status(401)
			.json({
				message: 'You cannot perform this action, log in as the correct users'
			})
	}

	next();
}

exports.addNotifications = (req, res, next) => {
	// req.notificationsToAdd: {data: [array of notifications], users: _id}
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
	req.body = JSON.parse(req.body.newUserData);

	/**
	 * Removing previous users avatar if new one gets uploaded
	 */
	let filesToDelete = [];
	if (req.files && req.files[0] && req.user.photo
		&& req.newUserData.photo === 'new'
	){
		filesToDelete.push(req.user.photo);
	}

	req.filesToDelete = filesToDelete;

	next();
}

exports.updateUser = (req, res) => {
	let newData = {
		...req.body,
		password:undefined,
		oldPassword: undefined
	};

	/**
	 * If new file is available, then users wants to change their avatar.
	 */
	if (req.files && req.files[0] && newData.photo === 'new'){
		newData.photo = mongoose.Types.ObjectId(req.files[0].id.toString());
	}

	/*
	 * Check if given password is equal to current one and set new password only in this case
	 */
	if (req.body.password){
		if (req.user.checkCredentials(req.body.oldPassword)){
			newData.password = req.newUserData.password;
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
	try {
		_.extend(newUser, newData);
	} catch (err){
		console.log(err.message);
		return res.status(err.status || 400)
			.json({
				error: {
					status: err.status || 400,
					message: err.message || err
				}
			})
	}

	newUser.updated = Date.now();
	if (!(Array.isArray(newUser.hiddenFields)
		&& !newUser.hiddenFields.includes('name')
	)){
		return res.status(400).json({
			error:{
				status: 400,
				message: 'Cannot make name a hidden field'
			}
		})
	}

	newUser.save()
		.then((result) => {
			return res.json({
				message: 'users updated successfully'
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


			let updates = [];
			for (let i = req.body.starting;
				 i < _.min([req.body.starting + req.body.cnt, preUpdates.length]);
				 i++
			){
				updates.push(preUpdates[i]);
			}

			console.log('test updates', updates)

			return res.json(updates);
		})
}

exports.removeUserMentions = (req, res, next) => {
	let filesToDelete = [], user = req.user;

	if (user.photo){
		filesToDelete.push(user.photo);
	}

	let teacherCourses = [];
	if (user.teacherCourses){
		teacherCourses = user.teacherCourses;
	}

	Course.find({ _id: { $in:
				[...user.enrolledCourses, ...teacherCourses, ...user.subscribedCourses]
		}})
		.then((courses) => {
			for (let c of courses){
				if (c.creator.equals(user._id)){
					let newCreator = null;
					for (let t = 0; t < c.teachers.length; t++){
						if (!c.teachers[t].equals(user._id)){
							newCreator = c.teachers[t];
							break;
						}
					}

					if (newCreator){
						c.creator = newCreator;
					}

					// if no new creator was found, then we leave the creator field to
					// later detect a course with deleted creator to clean it up or do smth else
				}
				let index = -1;
				for (let u = 0; u < c.subscribers.length; u++){
					if (c.subscribers[u].equals(user._id)){
						index = u;
						break;
					}
				}
				if (index >= 0){
					c.subscribers.splice(index, 1);
				}

				index = -1;
				for (let u = 0; u < c.students.length; u++){
					if (c.students[u].equals(user._id)){
						index = u;
						break;
					}
				}
				if (index >= 0){
					c.students.splice(index, 1);
				}

				index = -1;
				for (let u = 0; u < c.teachers.length; u++){
					if (c.teachers[u].equals(user._id)){
						index = u;
						break;
					}
				}
				if (index >= 0){
					c.teachers.splice(index, 1);
				}

				c.save();
			}
		})
		.catch(err => {
			console.log(err);
			res.status(err.status || 400)
				.json({
					error: err
				})
		})

	req.filesToDelete = filesToDelete;
	return next();
}

exports.deleteUser = (req, res) => {
	User.deleteOne({ _id: req.user._id})
		.then(() => {
			res.json({
				message: 'users deleted successfully'
			})
		})
		.catch(err => {
			console.log(err);
			res.status(err.status || 400)
				.json({
					error: err
				})
		})

}