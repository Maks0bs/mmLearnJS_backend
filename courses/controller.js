let Course = require('./model')
let User = require('../user/model');

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

exports.enrollInCourse = (req, res) => {
	courseId = req.body._id;
	Course.findOne({_id: courseId})
	.then(course => {
		if (course.hasPassword && !course.checkPassword(req.body.password)) {
			throw {
				status: 401,
				message: 'wrong course password'
			}
		}
		return course;
	})
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
		return Course.findByIdAndUpdate(
			courseId,
			{
				$push: {
					students: req.auth
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

exports.getOpenCourses = (req, res) => {
	// TODO add sorting by course categories or faculties
	//Course.find({  })
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