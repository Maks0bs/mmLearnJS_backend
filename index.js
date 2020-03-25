// module imports
let express = require('express');
let dotenv = require('dotenv');
let cors = require('cors');
let mongoose = require('mongoose')


// app imports
let mainRouter = require('./routes')


// config, database and setup
let app = express();
dotenv.config()
mongoose.connect(
  	process.env.MONGODB_URI,
  	{
  		useNewUrlParser: true,
   		useUnifiedTopology: true
   	}
)
.then(() => console.log(`MONGODB connected`))
mongoose.connection.on('error', err => {
  	console.log(`DB connection error: ${err.message}`)
});


// basic middleware and dev features
if (process.env.NODE_ENV !== 'production') {
	let morgan = require('morgan');
	app.use(morgan('dev'));
}
app.use(cors());

// app middleware
app.use('/', mainRouter);


// get requests from specified port

let port = process.env.PORT || 8080
app.listen(
	port,
	() => console.log(`App listening on port ${port}`)
)