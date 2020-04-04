let Course = require('./model')
let User = require('../user/model');

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
			message: 'Your course has been created successfully'
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
	User.findByIdAndUpdate(
		req.auth._id,
		{
			$push: {
				enrolledCourses: { courseId }
			}
		},
		{new: true}
	)
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
	let filter = {};
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
		console.log('--------------', req.body, courses);
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