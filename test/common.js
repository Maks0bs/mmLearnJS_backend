process.env.NODE_ENV = 'test';

let chai = require('chai');
let chaiHttp = require('chai-http');
let app = require('../index');
let should = chai.should();
let expect = chai.expect;
let mongoose = require('mongoose')
let User = require('../users/model')
let { Course } = require('../courses/model')
let Async = require('async');
let request = require('supertest')
let sinon = require('sinon');

exports.app = app;
exports.should = should;
exports.expect = expect;
exports.mongoose = mongoose;
exports.User = User;
exports.Course = Course;
chai.use(chaiHttp);
exports.chai = chai;
exports.Async = Async;
exports.request = request;
exports.errCallback = (status) => (res) => {
    res.should.have.status(status);
    let { body } = res;
    console.log(body);
    expect(body).to.be.an('object');
    expect(body.error).to.be.an('object');
    expect(body.error.message).to.be.a('string');
}
exports.sinon = sinon;
/** @param {string} id */
exports.getForgedId = (id) => {
    let wrongId;
    if (id[id.length - 1] === 'a'){
        wrongId = id.substring(0, id.length - 1) + 'b';
    } else {
        wrongId = id.substring(0, id.length - 1) + 'a';
    }
    return wrongId
}