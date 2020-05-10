let { 
	Course, 
	EntryFile, 
	EntryText, 
	Entry, 
	EntryContent,
	ForumTopicPost
} = require('./model')
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
		return course;
	})
	.then(course => {
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
	for (let i = 0; i < course.invitedTeachers.length; i++){
		let cur = course.invitedTeachers[i];
		if (cur.equals(req.auth._id)){
			course.invitedTeachers.splice(i, 1);
			hasTeacher = true;
			break;
		}
	}
	if (!hasTeacher){
		return res.status(401).json({
			message: 'You are not on the list of invited teachers to this course'
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

exports.entryById = (req, res, next, entryId) => {
	let len = 0;
	if (req.courseData.sections){
		len = req.courseData.sections.length
	}
	for (let section = 0; section < len; section++){
		for (let i = 0; i < req.courseData.sections[section].entries.length; i++){
			let entry = req.courseData.sections[section].entries[i];
			console.log('_id', entry._id, 'eid', entryId);
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

exports.topicById = (req, res, next, topicId) => {
	let len = 0;
	if (req.entry.data.content.topics){
		len = req.entry.data.content.topics.length;
	}

	for (let i = 0; i < len; i++){
		let topic = req.entry.data.content.topics[i];
		if (topic._id == topicId){
			req.topic = {
				data: topic,
				pos: i
			}
			return next();
		}
	}

	return res.status(404).json({
		error: {
			status: 404,
			message: "No topic with this id was found"
		}
	})
}

exports.postById = (req, res, next, postId) => {
	let len = 0;
	if (req.topic.data.posts){
		len = req.topic.data.posts.length;
	}

	for (let i = 0; i < len; i++){
		let post = req.topic.data.posts[i];
		if (post._id == postId){
			req.post = {
				data: post,
				pos: i
			}
			return next();
		}
	}

	return res.status(404).json({
		error: {
			status: 404,
			message: "No post with this id was found"
		}
	})
}

// req.body = {
// 	name,
// 	initContent
// }
exports.createForumTopic = (req, res) => {
	let entry = req.entry.data;
	console.log('entry', entry);
	if (req.userCourseStatus === 'student' && entry.content.teachersOnly){
		return res.status(401).json({
			error: {
				status: 401,
				message: 'only teachers can create topics in this forum'
			}
		})
	}
	let newTopic = {
		name: req.body.name,
		creator: req.auth,
		posts: [
			{
				creator: req.auth,
				content: req.body.initContent,
				answers: []
			}
		]
	};
	entry.content.topics.push(newTopic);
	let course = req.courseData;
	course.sections[req.entry.section].entries[req.entry.pos] = entry;
	course.save()
	.then(result => {
		return res.json(result);
	})
	.catch(err => {
		console.log(err);
		return res.status(err.status || 400)
			.json({
				error: err
			})
	})
}

exports.answerTopicPost = async (req, res) => {
	let entry = req.entry.data;
	if (req.userCourseStatus === 'student' && entry.content.teachersOnly){
		return res.status(401).json({
			error: {
				status: 401,
				message: 'only teachers can create topics in this forum'
			}
		})
	}
	let rawPost = {
		creator: req.auth,
		content: req.body.content,
		answers: []
	};
	let post = await new ForumTopicPost(rawPost);
	let course = req.courseData;
	course.sections[req.entry.section].entries[req.entry.pos]
		.content.topics[req.topic.pos].posts.push(post);
	course.sections[req.entry.section].entries[req.entry.pos]
		.content.topics[req.topic.pos].posts[req.post.pos].answers
		.push(mongoose.mongo.ObjectId(post._id));
	course.save()
	.then(result => {
		return res.json(result);
	})
	.catch(err => {
		console.log(err);
		return res.status(err.status || 400)
			.json({
				error: err
			})
	})
}