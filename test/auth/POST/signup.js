process.env.NODE_ENV = 'test';

let { app, chai, expect, request, Async } = require('../../common');
let { TEACHER_PASSWORD } = require('../../../constants').users


describe('POST /auth/signup', () => {
    let userData = {
        name: 'test',
        email: 'm@m.com',
        password: 'passw1'
    }
    let url = '/auth/signup';
    let callback = (status) => (res) => {
        res.should.have.status(status);
        //console.log(res.body);
        let { body } = res;
        expect(body).to.be.an('object');
        expect(body.error).to.be.an('object');
        expect(body.error.message).to.be.a('string');
    }
    let agent = request.agent(app);
    let invoke = () => agent.post(url);
    it('it should throw errors when user data is invalid', () => {
        return Promise.all([
            invoke()
                .send({...userData, name: ''})
                .expect(callback(400)),
            invoke()
                .send({...userData, email: 'm.com'})
                .expect(callback(400)),
            invoke()
                .send({...userData, password: 'pass1'})
                .expect(callback(400)),
            invoke()
                .send({...userData, password: 'passwordIsLong'})
                .expect(callback(400)),
            invoke()
                .send({...userData, teacher: true, teacherPassword: 'wrongPassword'})
                .expect(callback(401))
        ])
    });
    it('it should not accept short password', () => {
        // TODO test for correct password
    });
});