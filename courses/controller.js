let Course = require('./model')
let User = require('../user/model');
let _ = require('lodash');
let mongoose = require('mongoose');

exports.courseById = (req, res, next, id) => {
	Course.findOne({_id: id})
	.then(course => {
		if (!course) throw {
			status: 404,
			error: 'course not found'
		}

		req.courseData = course;
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

exports.createCourse = (req, res) => {
	console.log(req.body);
	let courseData = req.body;
	courseData.creator = req.auth;
	courseData.teachers = [req.auth];
	let course = new Course(courseData);
	User.findByIdAndUpdate(
		req.auth._id,
		{
			$push: {
				teacherCourses: course
			}
		},
		{new: true}
	)
	.populate('courses', '_id name')
	.then(result =>{
		return course.save();
	})
	.then(result => {
		return res.json({
			message: 'Your course has been created successfully',
			_id: course._id
		});
	})
	.catch(err => {
		console.log(err);
		return res.status(err.status || 400)
			.json({
				error: err
			})
	}) 

};

exports.getCleanupFiles = (req, res, next) => {
	// compare entries in found course with the one in req body
	// if compare file ids in both lists
	// if some ids that are in mongo course are not present in req body - delete them
	let curFiles = {};
	for (let section of req.courseData.sections){
		console.log('old section', section);
		for (let i of section.entries){
			console.log('old entry', i);
			if (i.type === 'file'){
				curFiles[i.content.id] = 'none';
			}
		}
	}

	for (let section of req.body.sections) {
		console.log('new section', section);
		for (let i of section.entries){

			console.log('new entry', i);
			if (i.type === 'file'){
				curFiles[i.content.id] = 'exist'
			}
		}
	}

	let filesToDelete = [];
	for (let i of Object.keys(curFiles)) {
		if (curFiles[i] === 'none'){
			filesToDelete.push(i);
		}
	}

	req.filesToDelete = filesToDelete;

	console.log('kdlfkdlfdkflsdkflsdkflsdkflsdkf', curFiles);

	console.log('files to delete', filesToDelete);

	next();
}

exports.updateCourse = (req, res) => {
	let course = req.courseData;
	course = _.extend(course, req.body);
	course.save()
	.then((result) => {
		return res.json({
			message: 'course updated successfully'
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

exports.enrollInCourse = (req, res) => {
	courseId = req.body._id;
	let course = req.courseData;
	if (course.hasPassword && !course.checkPassword(req.body.password)) {
		res.status(401).json({
			error: {
				status: 401,
				message: 'wrong course password'
			}
		})
	}
	course.students.push(req.auth);
	course.save()
	.then(course => {
		return User.findByIdAndUpdate(
			req.auth._id,
			{
				$push: {
					enrolledCourses: { _id: courseId }
				}
			},
			{new: true}
		)
	})
	.then(result => {
		return res.json({
			message: 'You have successfully enrolled in the course'
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

exports.getCoursesFiltered = async (req, res) => {

	//!!! add validation for sane request (e. g. can't post enrolled + teacher)
	let filter = {};
	if (req.body.courseId){
		filter._id = req.body.courseId;
	}
	if (req.body.type){
		filter.type = req.body.type;
	}
	if (req.body.enrolled){
		await User.findOne({_id: req.body.enrolled})
		.populate('enrolledCourses', '_id')
		.then(user => {
			filter._id = {
				$in: user.enrolledCourses
			}
		}) 
		.catch(err => {
			console.log(err);
			res.status(err.status || 400)
				.json({
					error: err
				})
		})
		
	}
	if (req.body.teacher){
		await User.findOne({_id: req.body.teacher})
		.populate('teacherCourses', '_id')
		.then(user => {
			filter._id = {
				$in: user.teacherCourses
			}
		})
		.catch(err => {
			console.log(err);
			res.status(err.status || 400)
				.json({
					error: err
				})
		})
	}
	Course.find({...filter})
	.populate('students', '_id name')
	.populate('teachers', '_id name')
	//maybe select only necessary info
	.sort('name')//optimize sorting - see bookmarks
	.then(courses => {
		return res.json(courses);
	})
	.catch(err => {
		console.log(err);
		res.status(err.status || 400)
			.json({
				error: err
			})
	})
}