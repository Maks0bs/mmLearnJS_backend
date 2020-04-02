let Course = require('./model')

exports.createCourse = (req, res) => {
	let courseData = req.body;
	courseData.creator = req.auth;
	courseData.teachers = [req.auth];
	let course = new Course(courseData);
	course.save()
		.then(result => {
			res.json(result);
		})
		.catch(err => {
			console.log(err);
			res.status(err.status || 400)
				.json({
					error: err
				})
		}) 

};

exports.enrollInCourse = (req, res) => {
	res.json({
		message: 'enrolled'
	})
}