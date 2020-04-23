let Course = require('./model')
let User = require('../users/model');
let _ = require('lodash');
let mongoose = require('mongoose');
let formidable = require('formidable'); 
let constants = require('../constants');
let { sendEmail } = require('../helpers');
let { COURSE_TEACHER_INVITATION } = constants.notifications
let { CLIENT_URL } = constants.client;
let jwt = require('jsonwebtoken');

let { JWT_SECRET } = constants.auth;

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

			if (courses[i].invitedTeachers){
				let invitedTeachers = _.cloneDeep(courses[i].invitedTeachers);
				courses[i].invitedTeachers = undefined;
				for (let invited of invitedTeachers){
					if (invited.equals(req.auth._id)){
						console.log('-----invited', invited);
						courses[i].invitedTeachers = invitedTeachers;
						break;
					}
				}
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

exports.sendTeacherInvite = (req, res, next) => {
	console.log('------req body', req.body);
	let newUser = false;
	User.findOne({email: req.body.email})
	.then((user) => {

		if (!user) {
			newUser = true;
			let token = jwt.sign(
                {
                    email: req.body.email,
                    teacher: true,
                    courseId: req.courseData._id,
                    courseName: req.courseData.name
                },
                JWT_SECRET,
                {
                    expiresIn: 30 * 24 * 60 * 60
                }
            )
			return sendEmail({
	            from: "noreply@mmlearnjs.com",
	            to: req.body.email,
	            subject: "Teacher invitation to course on mmlearnjs",
	            text: `You have been invited to be a teacher at the course "${req.courseData.name}" on mmlearnjs. Please sign up with this link to become a teacher at that course:
	            	${CLIENT_URL}/invite-signup/${token}?teacher=true&email=${req.body.email}`,
	            html: `
	            	<div>
		                <p>You have been invited to be a teacher at the course "${req.courseData.name}" on mmlearnjs.</p> 
		                <p>Please sign up with this link to become a teacher at that course: </p>
		                <p>${CLIENT_URL}/invite-signup/${token}?teacher=true&email=${req.body.email}</p>
		            </div>
	            `
	        })
		}

		if (user.role !== 'teacher') throw {
			status: 404,
			message: 'Teacher with this email could not be found'
		}
		req.invitedTeacher = user;
		req.notificationsToAdd = {
			user: user,
			data: [
				{
					type: COURSE_TEACHER_INVITATION,
					title: 'You are invited to be a teacher',
					text: `The creator of the course "${req.courseData.name}" has invited you
						to be a teacher in their course. You can accept of decline this invitation`,
					data: {
						courseId: req.courseData._id
					}
				}
			]
		}

		return sendEmail({
            from: "noreply@mmlearnjs.com",
            to: user.email,
            subject: "Teacher invitation to course",
            text: `You have been invited to be a teacher at the course "${req.courseData.name}". ${CLIENT_URL}/classroom/course/${req.courseData._id}`,
            html: `
                <p>You have been invited to be a teacher at the course "${req.courseData.name}".</p> 
                <p>${CLIENT_URL}/classroom/course/${req.courseData._id}</p>
            `
        });
	})
	.then((data) => {
		if (newUser){
			return res.json({
				message: 'invite send to unregistered user'
			})
		}
		return next();
	})
	.catch(err => {
		console.log(err);
		res.status(err.status || 400)
			.json({
				error: err
			})
	})
}

exports.addToInvitedList = (req, res) => {
	let course = req.courseData;
	course.invitedTeachers.push(req.invitedTeacher);
	course.save()
	.then(course => {
		return res.json({
			message: 'Invite sent to teacher'
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

exports.acceptTeacherInvite = (req, res) => {
	let course = req.courseData;
	let hasTeacher = false;
	console.log('request auth---fdfsdfsdfdf',req.auth);
	console.log('invited teachers arrayyyyy', course.invitedTeachers);
	for (let i = 0; i < course.invitedTeachers.length; i++){
		let cur = course.invitedTeachers[i];
		console.log('invited teacher-----', i, '----', cur);
		if (cur.equals(req.auth._id)){
			course.invitedTeachers.splice(i, 1);
			hasTeacher = true;
			break;
		}
	}
	if (!hasTeacher){
		return res.status(401).json({
			message: 'You are not on the list of invited teacher to this course'
		})
	}

	course.teachers.push(req.auth);

	course.save()
	.then((course) => {
		return User.findByIdAndUpdate(
			req.auth._id,
			{
				$pull: {
					notifications: {
						type: COURSE_TEACHER_INVITATION,
						data: {
							courseId: req.courseData._id
						}
					}
				},
				$push: {
					teacherCourses: course
				}
			},
			{new: true}
		)
	})
	.then((user) => {
		return res.json({
			message: 'You are now a teacher of this course'
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