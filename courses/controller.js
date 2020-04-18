let Course = require('./model')
let User = require('../users/model');
let _ = require('lodash');
let mongoose = require('mongoose');
let formidable = require('formidable'); 

exports.courseById = (req, res, next, id) => {
	Course.findOne({_id: id})
	.then(course => {
		if (!course) throw {
			status: 404,
			error: 'course not found'
		}

		course.salt = undefined;
		course.hashed_password = undefined;

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

exports.getNewCourseData = (req, res, next) => {
	console.log('request body----------', req.body);
	req.newCourseData = JSON.parse(req.body.newCourseData);
	req.filesPositions = req.body.filesPositions && JSON.parse(req.body.filesPositions);
	next();
}

exports.getCleanupFiles = (req, res, next) => {
	// compare entries in found course with the one in req body
	// if compare file ids in both lists
	// if some ids that are in mongo course are not present in req body - delete them
	let curFiles = {};
	if (!req.newCourseData.sections){
		return next();
	}
	for (let section of req.courseData.sections){
		for (let i of section.entries){
			if (i.type === 'file'){
				curFiles[i.content.id] = 'none';
			}
		}
	}

	for (let section of req.newCourseData.sections) {
		for (let i of section.entries){
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

	next();
}

exports.updateCourse = (req, res) => {
	let newCourseData = req.newCourseData;
	if (req.filesPositions){
		for (let i = 0; i < req.filesPositions.length; i++){
			let cur = req.filesPositions[i];
			newCourseData.sections[cur.section].entries[cur.entry].content = req.files[i]
		}
	}
	console.log('new request entries in update course', newCourseData.sections);
	let course = req.courseData;
	course = _.extend(course, newCourseData);
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
	//maybe select only necessary info
	.sort('name')//optimize sorting - see bookmarks
	.then(courses => {
		for (let i = 0; i < courses.length; i++){
			courses[i].salt = undefined;
			courses[i].hashed_password = undefined;
			if (courses[i].type === 'public'){
				continue;
			}
			if (!req.auth){
				courses[i].sections = undefined;
				courses[i].actions = undefined;
				courses[i].students = undefined;
				courses[i].creator = undefined;
				continue;
			}
			let isTeacher = false, isStudent = false;
			for (let teacher of courses[i].teachers){
				if (teacher.equals(req.auth._id)){
					isTeacher = true;
					break;
				}
			}
			for (let student of courses[i].students){
				if (student.equals(req.auth._id)){
					isStudent = true;
					break;
				}
			}
			if (courses[i].creator._id.equals(req.auth._id) || isTeacher){
				continue;
			}
			if (isStudent){
				courses[i].creator = undefined;
				continue;
			}
			
			courses[i].creator = undefined;
			courses[i].actions = undefined;
			courses[i].sections = undefined;
			courses[i].students = undefined;
		}
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

exports.deleteCourse = (req, res) => {
	Course.deleteOne({ _id: req.courseData._id})
	.then(() => {
		res.json({
			message: 'course deleted successfully'
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