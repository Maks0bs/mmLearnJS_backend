require('dotenv').config();

module.exports = {
	environment: process.env.NODE_ENV,
	users: {
		USER_HIDDEN: 'USER_HIDDEN'
	},
	network: {
		PORT: process.env.PORT || 8080
	},
	database: {
		MONGODB_URI: process.env.MONGODB_URI
	},
	auth: {
		JWT_SECRET: process.env.JWT_SECRET
	}
}