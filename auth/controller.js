let jwt = require('jsonwebtoken');
let User = require('../users/model');
let { Course } = require('../courses/model');
let { sendEmail } = require('../helpers');

let { JWT_SECRET } = require('../constants').auth

let { CLIENT_URL, DEFAULT_COOKIE_OPTIONS, NO_ACTION_LOGOUT_TIME } = require('../constants').client
let { TEACHER_PASSWORD } = require('../constants').users
let { ACTIVATE_ACCOUNT, COURSE_TEACHER_INVITATION } = require('../constants').notifications


exports.signup = (req, res) => {
    console.log(req.body);
    let data = {};
	User.findOne({ email: req.body.email })
        .then(user => {
            if (user) throw {
                status: 403,
                message: 'Email is taken'
            }

            if (req.body.teacher && req.body.teacherPassword === TEACHER_PASSWORD){
                req.body.role = 'teacher'
            }
            else if (req.body.teacher) throw {
                status: 401,
                message: 'Wrong teacher password'
            }
            req.body.notifications = [{
                type: ACTIVATE_ACCOUNT,
                title: 'Activate your account',
                text: 'Please check your email to activate your account'
            }]
            return new User(req.body)
        })
        .then(user => {
            let token = jwt.sign(
                {
                    _id: user._id,
                    email: user.email
                },
                JWT_SECRET,
                {
                    expiresIn: 15 * 60
                }
            )
            data = {
                email: user.email,
                token: token
            }
            return user.save()
        })
        .then(user => {
            return sendEmail({
                from: "noreply@mmlearnjs.com",
                to: data.email,
                subject: "Account activation instructions",
                text: `Please use the following link to activate your account: ${CLIENT_URL}/activate-account/${data.token}`,
                html: `
                    <p> Please use the following link to activate your account: </p> 
                    <p> ${CLIENT_URL}/activate-account/${data.token} </p>
                `
            });
        })
        .then(result => {
            res.json({
                message: `Signup success for user ${req.body.email}. Please check your email for activation`,
                auth: req.auth
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

exports.inviteSignup = (req, res) => {
    /*console.log('request', req.body);
    console.log('verified token', jwt.verify(req.body.token, JWT_SECRET));
    res.json({
        message: 'wow omg it works'
    })*/
    let inviteData = {};
    let emailData = {};
    try {
        inviteData = jwt.verify(req.body.token, JWT_SECRET)
    }
    catch (err) {
        if (err.name === 'TokenExpiredError'){
            res.status(401)
                .json({
                    error: {
                        status: 401,
                        message: 'Invite link expired. Try getting a new invite link'
                    }
                })
        }
        else{
            res.status(400)
                .json({
                    error: err
                })
        }
    }
    User.findOne({ email: req.body.email })
        .then(user => {
            if (user) throw {
                status: 403,
                message: 'Email is taken'
            }

            if (inviteData.teacher || (req.body.teacher && req.body.teacherPassword === TEACHER_PASSWORD)){
                req.body.role = 'teacher'
            }
            else if (req.body.teacher && req.body.teacherPassword !== TEACHER_PASSWORD) throw {
                status: 401,
                message: 'Wrong teacher password'
            }
            req.body.notifications = [
                {
                    type: ACTIVATE_ACCOUNT,
                    title: 'Activate your account',
                    text: 'Please check your email to activate your account'
                }
            ]

            if (inviteData.courseId){
                req.body.notifications.push({
                    type: COURSE_TEACHER_INVITATION,
                    title: 'You are invited to be a teacher',
                    text: `The creator of the course "${inviteData.courseName || inviteData.courseId}" has invited you
                        to be a teacher in their course. You can accept of decline this invitation`,
                    data: {
                        courseId: inviteData.courseId
                    }
                })
            }
            return new User(req.body)
        })
        .then(user => {
            let token = jwt.sign(
                {
                    _id: user._id,
                    email: user.email
                },
                JWT_SECRET,
                {
                    expiresIn: 15 * 60
                }
            )
            emailData = {
                email: user.email,
                token: token
            }
            return user.save()
        })
        .then(user => {
            if (!inviteData.courseId){
                return data;
            }
            return Course.findByIdAndUpdate(
                inviteData.courseId,
                {
                    $push: {
                        invitedTeachers: user
                    }
                },
                { new: true }
            )
        })
        .then(data => {
            return sendEmail({
                from: "noreply@mmlearnjs.com",
                to: emailData.email,
                subject: "Account activation instructions",
                text: `Please use the following link to activate your account: ${CLIENT_URL}/activate-account/${emailData.token}`,
                html: `
                    <p> Please use the following link to activate your account: </p> 
                    <p> ${CLIENT_URL}/activate-account/${emailData.token} </p>
                `
            });
        })
        .then(data => {
            res.json({
                message: `Signup success for user ${req.body.email}. Please check your email for activation`,
                auth: req.auth
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

exports.activateAccount = (req, res) => {
    let token = req.body.token;
    let userData;
    try {
        userData = jwt.verify(token, JWT_SECRET)
    }
    catch (err) {
        if (err.name === 'TokenExpiredError'){
            res.status(401)
                .json({
                    error: {
                        status: 401,
                        message: 'Activation link expired. Try getting a new activation link'
                    }
                })
        }
        else{
            res.status(400)
                .json({
                    error: err
                })
        }
    }

    User.findOne({ _id: userData._id })
        .then(user => {
            if (!user) throw {
                status: 403,
                message: 'Cannot activate user with this token'
            }
            if (user.activated){
                return res.json({
                    message: `Account for user with email ${userData.email} is already activated`
                })
            }
            user.activated = true;
            if (user.notifications){
                for (let i = 0; i < user.notifications.length; i++) {
                    let cur = user.notifications[i];
                    if (cur.type === ACTIVATE_ACCOUNT){
                        user.notifications.splice(i, 1);
                        break;
                    }
                }
            }
            
            return user.save();
        })
        .then(data => {
            res.json({
                message: `Account with email ${userData.email} successfully activated`,
                auth: req.auth
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

// TODO:
// add reset password without saving it in db
// make reset token with uuid

exports.signin = (req, res) => {
    let { _id, email, password } = req.body;
    User.findOne({ email })
        .then(user => {
            if (!user) throw {
                status: 403,
                message: `User with that email doesn't exist`
            }

            if (!user.checkCredentials(password)) throw {
                status: 401,
                message: 'Wrong password for this user'
            }

            let token = jwt.sign(
                {
                    _id: user._id,
                    role: user.role,
                    email: user.email
                },
                JWT_SECRET/*add expiration or work with browser cookies*/
            )

            res.cookie(
                'auth',
                token, 
                {
                    ...DEFAULT_COOKIE_OPTIONS,
                    maxAge: NO_ACTION_LOGOUT_TIME
                }
            );
            return res.json({
                message: `User ${user.email} signed in successfully`
            })
        })
        .catch(err => {
            res.status(err.status || 400)
                .json({
                    error: err
                })
        })



    
};

exports.authenticate = async (req, res, next) => {
    if (req.auth){
        res.json({
            securityError: 'auth is defined in req before obtaining it from cookies - that is illegal'
        })
    }
    let token = req.cookies['auth']
    if (!token){
        return next();
    }
    let userData = undefined;
    try {
        userData = jwt.verify(token, JWT_SECRET);
        delete userData.iat;
        req.auth = await User.findOne({_id: userData._id})
        return next();
    }
    catch(err) {
        console.log(err);
        return next();
    }
}

// change name
// this middleware should be called every time we perform an action on /classroom to check authentication
exports.extendSession = (req, res, next) => {
    if (!req.auth){
        return next()
    }
    try {
        let updatedToken = jwt.sign(
           {
                _id: req.auth._id,
                role: req.auth.role,
                email: req.auth.email
            },
            JWT_SECRET);
        res.cookie(
            'auth',
            updatedToken,
            {
                ...DEFAULT_COOKIE_OPTIONS,
                maxAge: NO_ACTION_LOGOUT_TIME
            }
        )
    }
    catch (err) {
        console.log(err);
    }

    return next()
}

exports.requireAuthentication = (req, res, next) => {
    if (!req.auth){
        return res.status(401).json({
            error: { message:'Unauthorized' }
        })
    }
    next();
}

exports.isTeacher = (req, res, next) => {
    if (req.auth.role !== 'teacher'){
        return res.status(401)
            .json({
                message: 'You are not a teacher'
            })
    }

    next();
}

exports.teacherInCourse = (req, res, next) => {
    if (!req.courseData.teachers){
        return res.status(401).json({
            message: 'No teachers in this course'
        })
    }

    let check = false;

    for (let i of req.courseData.teachers){
        if (i.equals(req.auth._id)){
            check = true;
            break;
        }
    }

    if (!check){
        return res.status(401).json({
            message: 'You are not authorized to perform this action'
        })
    }

    return next();
}

exports.isCreator = (req, res, next) => {
    if (!req.courseData.creator._id.equals(req.auth._id)){
        res.status(401).json({
            error: {
                status: 401,
                message: 'you are not the creator of the course'
            }
        })
    }
    else{
        next();
    }
}

exports.getAuthenticatedUser = (req, res) => {
    if (!req.auth){
        return res.json(null);
    }
    User.findOne({ _id: req.auth._id })
    .select('-salt -hashed_password')
    .then(user => {
        res.json(user);
    })
    .catch(err => {
        console.log(err);
        res.status(err.status || 400)
            .json({
                error: err
            })
    })
}

exports.logout = (req, res) => {
    res.clearCookie('auth', {...DEFAULT_COOKIE_OPTIONS});
    res.json({
        message: 'logout successful'
    })
}

/*exports.signin = (req, res) => {
	// find the user based on email
	let {_id, email, password} = req.body;
	User.findOne({email}, (err, user) => {
		if (err || !user){
			return res.status(401).json({
				error: "User with email " + req.body.email + " does not exist. Please signup."
			})
		}

		//if user not found make sure email and pass match
		//create auth method in model to use here
		if (!user.authenticate(password)){
			return res.status(401).json({
				error: "Email and password do not match"
			})
		}

		//generate a token with user id and secret
		let token = jwt.sign({_id: user._id, role: user.role}, constants.auth.JWT_SECRET || 'randomsecretcode');

		//persist the token as 't' is cookie with expiry date
		res.cookie("t", token, {expire: new Date() + 9999});

		//return response with user and token to frontend
		let {_id, name, email, role} = user;

		return res.json({token, user: {_id, email, name, role}});


	})


	
};

exports.signout = (req, res) => {
	res.clearCookie("t");
	return res.status(200).json({message: "Signout success!"});
};

exports.requireSignin = expressJwt({
	// if the token is valid, express jwt the verifies user's id 
	// in an auth key to the requests object
	secret: process.env.JWT_SECRET || 'randomsecretcode',
	userProperty: "auth"
});

exports.forgotPassword = (req, res) => {
    if (!req.body) return res.status(400).json({ message: "No request body" });
    if (!req.body.email)
        return res.status(400).json({ message: "No Email in request body" });
 
    console.log("forgot password finding user with that email");
    const { email } = req.body;
    console.log("signin req.body", email);
    // find the user based on email
    User.findOne({ email }, (err, user) => {
        // if err or no user
        if (err || !user)
            return res.status("401").json({
                error: "User with that email does not exist!"
            });
 
        // generate a token with user id and secret
        const token = jwt.sign(
            { _id: user._id, iss: "NODEAPI", role: user.role },
            process.env.JWT_SECRET || 'randomsecretcode'
        );
 
        // email data
        const emailData = {
            from: "noreply@node-react.com",
            to: email,
            subject: "Password Reset Instructions",
            text: `Please use the following link to reset your password: ${
                process.env.CLIENT_URL || 'test'
            }/reset-password/${token}`,
            html: `<p>Please use the following link to reset your password:</p> <p>${
                process.env.CLIENT_URL || 'test'
            }/reset-password/${token}</p>`
        };
 
        return user.updateOne({ resetPasswordLink: token }, (err, success) => {
            if (err) {
                return res.json({ message: err });
            } else {
                sendEmail(emailData);
                return res.status(200).json({
                    message: `Email has been sent to ${email}. Follow the instructions to reset your password.`
                });
            }
        });
    });
};
 
// to allow user to reset password
// first you will find the user in the database with user's resetPasswordLink
// user model's resetPasswordLink's value must match the token
// if the user's resetPasswordLink(token) matches the incoming req.body.resetPasswordLink(token)
// then we got the right user
 
exports.resetPassword = (req, res) => {
    const { resetPasswordLink, newPassword } = req.body;
 
    User.findOne({ resetPasswordLink }, (err, user) => {
        // if err or no user
        if (err || !user)
            return res.status("401").json({
                error: "Invalid Link!"
            });
 
        const updatedFields = {
            password: newPassword,
            resetPasswordLink: ""
        };

        console.log('wow');
 
        user = _.extend(user, updatedFields);
        user.updated = Date.now();
 
        user.save((err, result) => {
            if (err) {
                return res.status(400).json({
                    error: err
                });
            }
            res.json({
                message: `Great! Now you can login with your new password.`
            });
        });
    });
};

exports.socialLogin = (req, res) => {
    // try signup by finding user with req.email
    let user = User.findOne({ email: req.body.email }, (err, user) => {
        if (err || !user) {
            // create a new user and login
            user = new User(req.body);
            req.profile = user;
            user.save();
            // generate a token with user id and secret
            const token = jwt.sign(
                { _id: user._id, iss: "NODEAPI", role: user.role },
                process.env.JWT_SECRET || 'randomsecretcode'
            );
            res.cookie("t", token, { expire: new Date() + 9999 });
            // return response with user and token to frontend client
            const { _id, name, email, role } = user;
            return res.json({ token, user: { _id, name, email, role } });
        } else {
            // update existing user with new social info and login
            req.profile = user;
            user = _.extend(user, req.body);
            user.updated = Date.now();
            user.save();
            // generate a token with user id and secret
            const token = jwt.sign(
                { _id: user._id, iss: "NODEAPI", role: user.role },
                process.env.JWT_SECRET || 'randomsecretcode'
            );
            res.cookie("t", token, { expire: new Date() + 9999 });
            // return response with user and token to frontend client
            const { _id, name, email, role } = user;
            return res.json({ token, user: { _id, name, email, role } });
        }
    });
};*/