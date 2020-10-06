require('dotenv').config();

let clientUrl = process.env.CLIENT_URL;
let defaultCookieOptions
if (!clientUrl && process.env.NODE_ENV === 'production'){
	clientUrl = 'https://mmlearnjs.maks0bs.com'
} else if (!clientUrl){
	clientUrl = 'http://localhost:3000'
}

if (process.env.NODE_ENV === 'production'){
	defaultCookieOptions = {
		httpOnly: true,
        sameSite: 'None',
        secure: true
	}
}
else{
	defaultCookieOptions = {
		httpOnly: true
	}
}

module.exports = {
	environment: process.env.NODE_ENV,
	users: {
		USER_HIDDEN: 'USER_HIDDEN',
		TEACHER_PASSWORD: 'testpass'
	},
	network: {
		PORT: process.env.PORT || 8080
	},
	database: {
		MONGODB_URI: (() => {
			switch (process.env.NODE_ENV){
				case 'production':
					return process.env.MONGODB_URI
				case 'test':
					return process.env.MONGODB_TEST_URI
				case 'development':
					return process.env.MONGODB_DEV_URI
			}
		})(),
		FILES_UPLOAD_LIMIT: 500
	},
	auth: {
		JWT_SECRET: process.env.JWT_SECRET
	},
	client: {
		NO_ACTION_LOGOUT_TIME: 10 * 60 * 1000,
		DEFAULT_COOKIE_OPTIONS: defaultCookieOptions,
		CLIENT_URL: clientUrl
	},
	notifications: {
		ACTIVATE_ACCOUNT: 'USER_NOTIFICATION_ACTIVATE_ACCOUNT',
		COURSE_TEACHER_INVITATION: 'USER_NOTIFICATION_TEACHER_INVITATION'
	}
}