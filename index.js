let express = require('express');
let dotenv = require('dotenv');
// imports

// config and setup
dotenv.config()
let app = express();

// basic middleware (TODO)

// temporary test route
app.get('/', (req, res) => {
	res.json({
		message: 'test successful'
	})
})

app.listen(process.env.PORT || 8080)