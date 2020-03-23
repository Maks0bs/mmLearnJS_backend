let express = require('express');
let dotenv = require('dotenv');
let cors = require('cors');
let morgan = require('morgan');
// imports

// config and setup
dotenv.config()
let app = express();

// basic middleware
app.use(cors());
if (process.env.NODE_ENV !== 'production') {
	app.use(morgan('dev'));
}

// temporary test route
app.get('/', (req, res) => {
	res.json({
		message: 'test successful'
	})
})

app.listen(process.env.PORT || 8080)