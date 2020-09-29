process.env.NODE_ENV = 'test';

let chai = require('chai');
let chaiHttp = require('chai-http');
let app = require('../index');
let should = chai.should();
let expect = chai.expect;
let mongoose = require('mongoose')
let User = require('../users/model')

exports.app = app;
exports.should = should;
exports.expect = expect;
exports.mongoose = mongoose;
exports.User = User;
chai.use(chaiHttp);
exports.chai = chai;
