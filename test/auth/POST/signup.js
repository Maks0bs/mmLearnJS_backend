process.env.NODE_ENV = 'test';

let { app, expect, request, errCallback, User } = require('../../common');
let { TEACHER_PASSWORD } = require('../../../constants').users


describe('POST /auth/signup', () => {
    beforeEach(() => {
        return User.remove({});
    })
    let userData = {
        name: 'test',
        email: 'maksthepro123@gmail.com',
        password: 'passw1'
    }
    let url = '/auth/signup';
    let agent = request.agent(app);
    let invoke = () => agent.post(url);
    it('throw errors when user data is invalid', () => {
        return Promise.all([
            invoke()
                .send({...userData, name: ''})
                .expect(errCallback(400)),
            invoke()
                .send({...userData, email: 'm.com'})
                .expect(errCallback(400)),
            invoke()
                .send({...userData, password: 'pass1'})
                .expect(errCallback(400)),
            invoke()
                .send({...userData, password: 'passwordIsLong'})
                .expect(errCallback(400)),
            invoke()
                .send({...userData, teacher: true, teacherPassword: 'wrongPassword'})
                .expect(errCallback(401))
        ])
    });
    it('create account correctly', () => {
        //let emailSpy = sinon.spy(require('../../../helpers').sendEmail);
        return invoke()
            .send(userData)
            .expect(200)
            .expect(res => {
                let { body } = res;
                expect(body).to.be.an('object');
                expect(body.message).to.be.a('string');
                expect(body.user).to.be.an('object');
                expect(body.user._id).to.be.a('string')
                expect(body.user._id.length).to.be.a('number').eql(24);
                expect(body.user.hashed_password).to.be.a('string');
                expect(body.user.activated).to.be.a('boolean').eql(false);
                expect(body.user.role).to.be.a('string');
                expect(body.user.salt).to.be.a('string');
                expect(body.user.created).to.be.a('string');
                // should have a notification that states that the account is not activated
                expect(body.user.notifications).to.be.an('array');
                expect(body.user.notifications.length).to.be.above(0);
                expect(body.user.notifications[0]).to.be.an('object');
                expect(body.user.notifications[0].title).to.be.a('string');
                expect(body.user.notifications[0].text).to.be.a('string');
                expect(body.user.notifications[0].type).to.be.a('string');
                expect(body.user.notifications[0].created).to.be.a('string');
            })
    })
    it('create teacher account', () => {
        return invoke()
            .send({...userData, teacher: true, teacherPassword: TEACHER_PASSWORD})
            .expect(200)
            .expect(res => {
                let { body } = res;
                expect(body.user._id).to.be.a('string')
                expect(body.user._id.length).to.be.a('number').eql(24);
                expect(body.user.role).to.be.a('string').eql('teacher');
                expect(body.user.teacherCourses).to.be.a('array');
            })
    })
    it('not create accounts with duplicate email', () => {
        return invoke()
            .send(userData)
            .then(() => invoke()
                .send(userData)
                .expect(errCallback(403))
            )
    })
});