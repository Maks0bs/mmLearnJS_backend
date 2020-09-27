process.env.NODE_ENV = 'test';

let chai = require('chai');
let chaiHttp = require('chai-http');
let app = require('../index');
let should = chai.should();
let expect = chai.expect;
let mongoose = require('mongoose')
let User = require('../users/model')

chai.use(chaiHttp);

describe('User', () => {
    beforeEach((done) => {
        User.remove({}, () => done())
    })
    describe('GET /users', () => {
        it('check with empty user list', (done) => {
            chai.request(app)
                .get('/users')
                .end((err, res) => {
                    res.should.have.status(200);
                    expect(res.body).to.be.a('array');
                    expect(res.body.length).to.be.eql(0);
                    done();
                })
        });
    });
    describe('GET /users/:userId', () => {
        it('it should GET a user by the given id', (done) => {
            let user = new User({ name: 'test', email: 'm@m.com', password: 'passw1'});
            console.log(user);
            user.save((err, user) => {
                chai.request(app)
                    .get(`/users/${user._id}`)
                    .end((err, res) => {
                        res.should.have.status(200);
                        let { body } = res;
                        expect(body).to.be.a('object');
                        expect(body).to.have.property('name');
                        expect(body).to.have.property('email');
                        expect(body).not.to.have.property('hashed_password');
                        expect(body).to.have.property('_id').eql(user._id.toString());
                        done();
                    });
            });

        });
    });
})

