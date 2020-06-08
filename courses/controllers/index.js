let { 
	Course, 
	EntryFile, 
	EntryText, 
	Entry, 
	EntryContent,
	ForumTopicPost
} = require('../model')
let User = require('../../users/model');
let _ = require('lodash');
let mongoose = require('mongoose');
let formidable = require('formidable'); 
let constants = require('../../constants');
let { sendEmail } = require('../../helpers');
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
		return course;
	})
	.then(course => {

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
	console.log('create coruse body', req.body)
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

// change update, add objectid handling
exports.updateCourse = async (req, res) => {
	let newCourseData = req.newCourseData;

	if (req.filesPositions){
		for (let i = 0; i < req.filesPositions.length; i++){
			let cur = req.filesPositions[i];
			newCourseData.sections[cur.section].entries[cur.entry].content = req.files[i]
		}
	}

	let len = 0;
	if (newCourseData.sections){
		len = newCourseData.sections.length
	}

	for (let section = 0; section < len; section++){
		for (let i = 0; i < newCourseData.sections[section].entries.length; i++){
			let cur = newCourseData.sections[section].entries[i];
			if (!cur.content.kind){
				switch(cur.type){
					case 'file': {
						newCourseData.sections[section].entries[i].content.kind = 'EntryFile'
						break;
					}
					case 'text': {
						newCourseData.sections[section].entries[i].content.kind = 'EntryText'
						break;
					}
					case 'forum': {
						newCourseData.sections[section].entries[i].content.kind = 'EntryForum'
						break;
					}
					default: {
						newCourseData.sections[section].entries[i].content.kind = 'EntryContent'
						break;
					}
				}
			}
		}
	}

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
	console.log('req body enroll', req.body);
	courseId = req.body._id;
	let course = req.courseData;
	if (course.hasPassword && !course.checkPassword(req.body.password)) {
		return res.status(401).json({
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

		//Populating different fields in this loop
		//This loop can be used not only for forums, but for all other types of entries

		let usersToPopulate = [], usersToPopulateSet = {};
		
		for (let c = 0; c < courses.length; c++){
			if (!courses[c].sections){
				continue;
			}

			for (let i = 0; i < courses[c].sections.length; i++){
				for (let j = 0; j < courses[c].sections[i].entries.length; j++){
					let entry = courses[c].sections[i].entries[j];

					if (entry.type === 'forum'){

						//populate topic creators and posts creators
						for (let topic of entry.content.topics){
							if (!usersToPopulateSet[topic.creator._id]){
								usersToPopulateSet[topic.creator._id] = 1;
								usersToPopulate.push(topic.creator._id);
							}

							for (let post of topic.posts){
								if (!usersToPopulateSet[post.creator._id]){
									usersToPopulateSet[post.creator._id] = 1;
									usersToPopulate.push(post.creator._id);
								}
							}
						}
					}
				}
			}
		}


		User.find({
			_id: {
				$in: usersToPopulate
			}
		})
		.select('_id name email role')
		.then((users) => {
			for (let user of users){
				usersToPopulateSet[user._id] = user;
			}

			for (let c = 0; c < courses.length; c++){
				if (!courses[c].sections){
					continue;
				}

				for (let i = 0; i < courses[c].sections.length; i++){
					for (let j = 0; j < courses[c].sections[i].entries.length; j++){
						let entry = courses[c].sections[i].entries[j];

						if (entry.type === 'forum'){

							//populate topic creators and posts creators
							for (let t = 0; t < courses[c].sections[i].entries[j].content.topics.length; t++){
								courses[c].sections[i].entries[j].content.topics[t].creator = 
									usersToPopulateSet[
										courses[c].sections[i].entries[j].content.topics[t].creator._id
									];

								for (let p = 0; p < courses[c].sections[i].entries[j].content.topics[t].posts.length; p++){
									courses[c].sections[i].entries[j].content.topics[t].posts[p].creator = 
									usersToPopulateSet[
										courses[c].sections[i].entries[j].content.topics[t].posts[p].creator._id
									];
								}
							}
						}
					}
				}
			}

			return res.json(courses);
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

exports.entryById = (req, res, next, entryId) => {
	let len = 0;
	if (req.courseData.sections){
		len = req.courseData.sections.length
	}
	for (let section = 0; section < len; section++){
		for (let i = 0; i < req.courseData.sections[section].entries.length; i++){
			let entry = req.courseData.sections[section].entries[i];
			if(entry._id == entryId){
				req.entry = {
					data: entry,
					section: section,
					pos: i
				}
				return next();
			}
		}
	}

	return res.status(404).json({
		error: {
			status: 404,
			message: "No entry with this id was found"
		}
	})
}

