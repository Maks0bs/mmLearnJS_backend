let jwt = require('jsonwebtoken');
let User = require('../user/model');
let { sendEmail } = require('../helpers');

let { JWT_SECRET } = require('../constants').auth
let { CLIENT_URL } = require('../constants').client
let { environment } = require('../constants')

exports.signup = (req, res) => {
	User.findOne({ email: req.body.email })
        .then(user => {
            if (user) throw {
                status: 403,
                message: 'Email is taken'
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
            let data = {
                email: user.email,
                token: token
            }
            user.save()
            return data;
        })
        .then(data => {
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
        .then(data => {
            res.json({
                message: `Signup success for user ${req.body.email}`
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

exports.sendActivationToken = (req, res) => {

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
    }

    User.findOne({ _id: userData._id })
        .then(user => {
            if (!user) throw {
                status: 403,
                message: 'Cannot activate user with this token'
            }
            user.activated = true;
            return user.save();
        })
        .then(data => {
            res.json({
                message: `Account with email ${userData.email} successfully activated`
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
                    httpOnly: true,
                    sameSite: 'none',
                    secure: true,
                    maxAge: 100000
                }
            );
            console.log(res.getHeaders());
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

exports.test = (req, res) => {
    res.json({
        info: jwt.verify(req.cookies['auth'], JWT_SECRET)
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