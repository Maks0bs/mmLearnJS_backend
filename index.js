let constants = require('./constants')
let express = require('express');
let cors = require('cors');
let mongoose = require('mongoose')
let bodyParser = require('body-parser');
let cookieParser = require('cookie-parser');
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

let app = express();

// connect to Mongo database
mongoose.connect(
  	constants.database.MONGODB_URI,
  	{
  		useNewUrlParser: true,
   		useUnifiedTopology: true,
        useFindAndModify: false,
        ssl: true
   	}
)
    .then(() => console.log(`MONGODB connected`));
mongoose.connection.on('error', err => {
  	console.log(`DB connection error: ${err.message || err}`)
});

// dev middleware
if (constants.environment !== 'production') {
	let morgan = require('morgan');
	app.use(morgan('dev'));
}

// general CORS for all requests
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin === constants.client.CLIENT_URL)
            return callback(null, true);
        return callback(
            new Error(
                'the cors policy for this site does not ' +
                'allow access from the specified origin'
            ),
            false
        )
    },
    withCredentials: true,
    credentials: true
}));

// middleware for processing requests
app.use(bodyParser.json());
app.use(cookieParser());

// include all api middleware
let mainRouter = require('./routes')
app.use('/', mainRouter);

// documentation middleware
let swaggerSpecs = swaggerJsdoc(constants.swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

let port = constants.network.PORT || 8080
// receive requests from specified port
app.listen(
	port, () => console.log(`App listening on port ${port}`)
)

module.exports = app;