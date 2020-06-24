let User = require('../../users/model');
let constants = require('../../constants');
const jwt = require("jsonwebtoken");
let { sendEmail } = require('../../helpers');
let { COURSE_TEACHER_INVITATION } = constants.notifications
let { JWT_SECRET } = constants.auth;
let { CLIENT_URL } = constants.client;

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
                    courseName: req.courseData.name,
					invited: true
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
			message: 'User with this email is a STUDENT, can\'t make teachers out of students'
		}
		if (req.courseData.teachers.includes(user._id)) throw {
			status: 400,
			message: 'User with this email is already a teacher at this course'
		}
		if (req.courseData.invitedTeachers.includes(user._id)) throw {
			status: 400,
			message: 'User with this email is already invited'
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
				message: 'invitation sent to unregistered user'
			})
		}
		return next();
	})
	.catch(err => {
		console.log(err);
		res.status(err.status || 400)
			.json({
				error: err.message ? {
						status: err.status,
						message: err.message
					}
					: err
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
	let hasInvited = false, isTeacher = false
	for (let i = 0; i < course.invitedTeachers.length; i++){
		let cur = course.invitedTeachers[i];
		if (cur.equals(req.auth._id)){
			course.invitedTeachers.splice(i, 1);
			hasInvited = true;
			break;
		}
	}
	for (let i = 0; i < course.teachers.length; i++){
		let cur = course.teachers[i];
		if (cur.equals(req.auth._id)){
			isTeacher = true;
			break;
		}
	}
	if (!hasInvited){
		return res.status(401).json({
			error: {
				status: 401,
				message: 'You are not on the list of invited teachers to this course'
			}
		})
	}
	if (isTeacher){
		return res.json({
			message: 'You are already a teacher at this course'
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