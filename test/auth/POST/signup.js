process.env.NODE_ENV = 'test';

let { app, chai, expect, User } = require('../../common');

describe('POST /auth/signup', () => {
    it('it should not create a user with false email', (done) => {
        let userData = {
            name: 'test',
            email: 'm.com',
            password: 'passw1'
        }
        chai.request(app)
            .post('/auth/signup')
            .send(userData)
            .end((err, res) => {
                res.should.have.status(400);
                let { body } = res;
                expect(body).to.be.an('object');
                expect(body.error).to.be.an('object');
                expect(body.error.message).to.be.a('string');
                done()
            })
    });
    it('it should not accept short password', (done) => {
        // TODO test for correct password
    });
});