// module imports
let constants = require('./constants')
let express = require('express');
let cors = require('cors');
let mongoose = require('mongoose')
let bodyParser = require('body-parser');


// app imports
let mainRouter = require('./routes')


// config, database and setup
let app = express();
mongoose.connect(
  	constants.database.MONGODB_URI,
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
if (constants.environment !== 'production') {
	let morgan = require('morgan');
	app.use(morgan('dev'));
}
app.use(cors());
app.use(bodyParser.json());

// app middleware
app.use('/', mainRouter);


// get requests from specified port

let port = constants.network.PORT || 8080
app.listen(
	port,
	() => console.log(`App listening on port ${port}`)
)