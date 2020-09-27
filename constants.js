require('dotenv').config();
// various config constants
// you should only use variables from this file
// accessing process.env is discouraged
let clientUrl = process.env.CLIENT_URL;
let apiUrl = process.env.API_URL;
let defaultCookieOptions
if (!clientUrl && process.env.NODE_ENV === 'production'){
	clientUrl = 'https://mmlearnjs-frontend.herokuapp.com'
} else if (!clientUrl){
	clientUrl = 'http://localhost:3000'
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
				{
					url: apiUrl
				}
			]
		},
		apis: [
			"./*.js", "./routes/*.js", "./users/*/*.js", "./courses/*.js", "./courses/*/*.js",
			"./files/*.js"
		]
	},
	environment: process.env.NODE_ENV,
	users: {
		USER_HIDDEN: 'USER_HIDDEN',
		TEACHER_PASSWORD: 'testpass'
	},
	network: {
		PORT: process.env.NODE_ENV === 'test' ?
			9000 : (process.env.PORT || 8080)
	},
	database: {
		MONGODB_URI: process.env.NODE_ENV === 'test' ?
			process.env.MONGODB_TEST_URI : process.env.MONGODB_URI,
		FILES_UPLOAD_LIMIT: 50
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

/**
 * @namespace models
 */
/**
 * @namespace routers
 */
/**
 * @namespace controllers
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Date:
 *       type: object
 *       description: >
 *         Date type. The Date BSON type is used in MongoDB. Internally it is a 64-bit integer.
 *         See MongoDB docs for details
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     ObjectID:
 *       type: object
 *       description: >
 *         ObjectID type. The ObjectID BSON type is used in MongoDB to represent refs to other objects in the
 *         Database. See MongoDB docs for details
 */
