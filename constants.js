require('dotenv').config();

let clientUrl = process.env.CLIENT_URL
if (!clientUrl && process.env.NODE_ENV === 'production'){
	clientUrl = 'https://mmlearnjs-frontend.herokuapp.com/'
}
else if (!clientUrl){
	clientUrl = 'http://localhost:3000'
}

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
	},
	client: {
		CLIENT_URL: clientUrl
	}
}