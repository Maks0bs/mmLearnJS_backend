let User = require('../../users/model');
let constants = require('../../constants');
const jwt = require("jsonwebtoken");
let { sendEmail, handleError } = require('../../helpers');
let { COURSE_TEACHER_INVITATION } = constants.notifications,
	{ JWT_SECRET } = constants.auth,
	{ CLIENT_URL } = constants.client,
	{ COURSE_INVITATION_DURATION} = constants.users
/**
 * @type function
 * @throws 403
 * @description sends the invitation to the course to the specified email address.
 * If the user with such email is a teacher, add a notification in their account.
 * Otherwise send an invitation link in the email to signup with a special token.
 * See {@link controllers.users.usersData.inviteSignup inviteSignup controller}
 * for details on the token. If the invited user was a teacher, add the
 * teacher's data with the new notification to the `req.invitedTeacher` object
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {models.User} [req.invitedTeacher]
 * @param {function} next
 * @memberOf controllers.courses
 */
const sendTeacherInvite = (req, res, next) => {
	let newUser = false;
	let getInviteSignupString = (token) => (
		'Please sign up with this ' +
		'link to become a teacher at that course: \n' +
		`${CLIENT_URL}/invite-signup/${token}?teacher=true&email=${req.body.email}`
	)
	let registeredUserString = `${CLIENT_URL}/classroom/course/${req.course._id}`
	let getEmailData = (isNewUser, token) => ({
		from: "noreply@mmlearnjs.com",
		to: req.body.email,
		subject: "Teacher invitation to course on mmLearnJS",
		text: 'You have been invited to be a teacher at the course ' +
			`"${req.course.name}" on mmLearnJS. ` +
			(isNewUser ? getInviteSignupString(token) : registeredUserString),
		html: `
			<div>
				<p>
					You have been invited to be a teacher at 
					the course "${req.course.name}" on mmLearnJS.
				</p> 
				<p> 
					(isNewUser ? getInviteSignupString(token) : registeredUserString) 
				</p>
			</div>
		`
	})
	return User.findOne({email: req.body.email})
		.then((user) => {
			if (!user) {
				// in case the user with given email could not be found,
				// send an invitation signup link to the invited user
				newUser = true;
				let token = jwt.sign(
					{
						email: req.body.email,
						teacher: true,
						courseId: req.course._id,
						courseName: req.course.name,
						invited: true
					},
					JWT_SECRET,
					{expiresIn: COURSE_INVITATION_DURATION}
				)
				return sendEmail(getEmailData(true, token));
			}
			if (user.role !== 'teacher') throw {
				status: 403,
				message: 'User with this email is a STUDENT'
			}
			if (req.course.teachers.includes(user._id)) throw {
				status: 403,
				message: 'User with this email is already a teacher at this course'
			}
			if (req.course.invitedTeachers.includes(user._id)) throw {
				status: 403,
				message: 'User with this email is already invited'
			}
			user.addNotification({
				type: COURSE_TEACHER_INVITATION + '/course:' + req.course._id.toString(),
				title: 'You are invited to be a teacher',
				text:
					`The creator of the course "${req.course.name}" has ` +
					'invited you to be a teacher in their course. ' +
					'You can accept of decline this invitation'
			})
			req.invitedTeacher = user;

			return sendEmail(getEmailData(false));
		})
		.then(() => {
			if (newUser){
				return res.json({ message: 'Invitation sent to unregistered user'})
			}
			return next();
		})
		.catch(err => handleError(err, res))
}
exports.sendTeacherInvite = sendTeacherInvite;

/**
 * @type function
 * @description adds the user, specified under `req.invitedTeacher` to the
 * list of invited teachers in the course which was found by id and saved in `req.course`.
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {models.User} [req.invitedTeacher]
 * @memberOf controllers.courses
 */
const addToInvitedList = (req, res) => {
	let {course, invitedTeacher} = req;
	if (invitedTeacher){
		course.invitedTeachers.push(req.invitedTeacher);
	}
	return course.save()
		.then(() => {
			return res.json({ message: 'Teacher has been invited'})
		})
		.catch(err => handleError(err, res))
}
exports.addToInvitedList = addToInvitedList;

/**
 * @type function
 * @throws 401
 * @description the authenticated user
 * accepts the invitation to the course with the specified ID and therefore
 * gets added to the teacher list of this course and the course
 * gets added to the user's `teacherCourses` list
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {models.User} req.auth
 * @memberOf controllers.courses
 */
const acceptTeacherInvite = (req, res) => {
	let {course} = req;
	let invitedTeacherPos =
		course.invitedTeachers.findIndex(t => t.equals(req.auth._id));
	if (invitedTeacherPos >= 0){
		// remove the user from the list of invited teachers
		course.invitedTeachers.splice(invitedTeacherPos, 1);
	} else {
		return res.status(401).json({
			error: {
				status: 401,
				message: 'You are not on the list of invited teachers to this course'
			}
		})
	}
	if (course.teachers.findIndex(t => t.equals(req.auth._id)) >= 0){
		return res.json({
			message: 'You are already a teacher at this course'
		})
	}
	course.teachers.push(req.auth);

	let notificationType =
		COURSE_TEACHER_INVITATION + '/course:' + req.course._id.toString()
	return course.save()
		.then((course) => {
			// remove notification about course invitation
			// and add course to the list of teacher courses for user
			return User.findByIdAndUpdate(
				req.auth._id,
				{
					$pull: { notifications: { type: notificationType } },
					$push: { teacherCourses: course }
				},
				{new: true}
			)
		})
		.then(() => {
			return res.json({
				message: 'You are now a teacher of this course'
			})
		})
		.catch(err => {handleError(err, res)})
}
exports.acceptTeacherInvite = acceptTeacherInvite;