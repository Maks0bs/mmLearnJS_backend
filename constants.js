require('dotenv').config();
// various config constants
// you should only use variables from this file
// accessing process.env is discouraged
let clientUrl = process.env.CLIENT_URL;
let clientDevUrl = process.env.CLIENT_DEV_URL;
let apiUrl = process.env.API_URL;
let defaultCookieOptions
if (!clientUrl && process.env.NODE_ENV === 'production'){
	clientUrl = 'https://mmlearnjs.maks0bs.com'
} else if (!clientUrl){
	clientUrl = 'http://localhost:3000'
}
if (!clientDevUrl && process.env.NODE_ENV === 'production'){
	clientDevUrl = 'https://mmlearnjs-dev.maks0bs.com'
} else if (!clientDevUrl){
	clientDevUrl = 'http://localhost:3000'
}
if (!apiUrl && process.env.NODE_ENV === 'production'){
	apiUrl = 'https://mmlearnjs-backend.herokuapp.com'
} else if (!apiUrl){
	apiUrl = 'http://localhost:8080'
}
if (process.env.NODE_ENV === 'production'){
	defaultCookieOptions = {
		httpOnly: true,
        sameSite: 'None',
        secure: true
	}
} else {
	defaultCookieOptions = { httpOnly: true }
}

module.exports = {
	swaggerOptions: {
		swaggerDefinition: {
			openapi: "3.0.0",
			info: {
				title: "mmLearnJS api",
				version: "1.1.1",
				description:
					"The API for the mmLearnJS project",
				contact: {
					name: "Maksym Litvak (maks0bs)",
					url: "https://maks0bs.com",
					email: "maksthebro173@gmail.com"
				}
			},
			servers: [
				{ url: apiUrl }
			]
		},
		apis: [
			"./*.js", "./*.jsdoc", "./routes/*.js", "./*/*/*.js"
		]
	},
	environment: process.env.NODE_ENV,
	users: {
		USER_HIDDEN: 'USER_HIDDEN',
		TEACHER_PASSWORD: 'testpass',
		ACTIVATION_TIME_PERIOD: 24 * 60 * 60,
		COURSE_INVITATION_DURATION: 30 * 24 * 60 * 60
	},
	network: {
		PORT: process.env.NODE_ENV === 'test' ?
			9000 : (process.env.PORT || 8080)
	},
	mail: {
		gmailClientCredentials: {
			user: "maksthebro173@gmail.com",
			pass: "pdkxgrrcdduoffjc"
		}
	},
	database: {
		MONGODB_URI: (() => {
			switch (process.env.NODE_ENV){
				case 'production':
					return process.env.MONGODB_URI
				case 'test':
					return process.env.MONGODB_TEST_URI
				case 'development':
				case 'dev':
					return process.env.MONGODB_DEV_URI
			}
		})(),
		FILES_UPLOAD_LIMIT: 50,
		MAX_FILE_SIZE: 1024 * 1024 * 100 // 100 MiB (in bytes)
	},
	auth: {
		JWT_SECRET: process.env.JWT_SECRET
	},
	client: {
		NO_ACTION_LOGOUT_TIME: 10 * 60 * 1000,
		DEFAULT_COOKIE_OPTIONS: defaultCookieOptions,
		CLIENT_URL: clientUrl,
		CLIENT_DEV_URL: clientDevUrl
	},
	notifications: {
		ACTIVATE_ACCOUNT: 'USER_NOTIFICATION_ACTIVATE_ACCOUNT',
		COURSE_TEACHER_INVITATION: 'USER_NOTIFICATION_TEACHER_INVITATION'
	},
	errors: {
		CONTACT_EMAIL: process.env.NODE_ENV === 'production' ?
			'maksthebro173@gmail.com' : 'maksthepro123@gmail.com'
	}
}