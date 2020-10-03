process.env.NODE_ENV = 'test';

let jwt = require('jsonwebtoken');
let { app, expect, request, errCallback, User, Course } = require('../../common');
let { TEACHER_PASSWORD } = require('../../../constants').users
let { COURSE_TEACHER_INVITATION } = require('../../../constants').notifications


describe('POST /auth/invite-signup/:inviteToken', () => {
    //TODO check if email was sent with sinon
    let course;
    beforeEach(() => {
        return User.remove({})
            .then(() => Course.remove({}))
            .then(() => {
                let teacher = new User({name: 'teacher', email: 't@m.com', password: 'passw1'});
                return teacher.save();
            })
            .then((teacher) =>{
                let course = new Course({name: 'c1', creator: teacher._id, type: 'open'});
                return course.save();
            })
            .then((newCourse) => {
                course = newCourse;
                return Promise.resolve(true);
            })
    })
    let userData = {
        name: 'secondName',
        email: 'maksthepro123@gmail.com',
        password: 'passw1'
    }
    let url = '/auth/invite-signup';
    let agent = request.agent(app);
    let invoke = (token) => agent.post(`${url}/${token}`);
    it('throw errors when user data is invalid', () => {
        let tokenData = {
            name: 'firstName', email: 'm@m.com', invited: true
        }
        let token = jwt.sign(tokenData, process.env.JWT_SECRET)
        return Promise.all([
            invoke(token)
                .send({...userData, name: ''})
                .expect(errCallback(400)),
            invoke(token)
                .send({...userData, email: 'm.com'})
                .expect(errCallback(400)),
            invoke(token)
                .send({...userData, password: 'pass1'})
                .expect(errCallback(400)),
            invoke(token)
                .send({...userData, password: 'passwordIsLong'})
                .expect(errCallback(400)),
            invoke(token)
                .send({...userData, teacher: true, teacherPassword: 'wrongPassword'})
                .expect(errCallback(401))
        ])
    });
    it('should not do anything if token is invalid does not have the "invited" prop', () => {
        let tokenData = {
            name: 'firstName', email: 'm@m.com'
        }
        let token = jwt.sign(tokenData, process.env.JWT_SECRET)
        let wrongToken = jwt.sign(tokenData, 'wrongsecret');
        return Promise.all([
            invoke(token)
                .send(userData)
                .expect(errCallback(401)),
            invoke(wrongToken)
                .send(userData)
                .expect(errCallback(401)),
        ])
    })
    it(
        'should create accounts and req.body ' +
        'data should have priority over token data (no account activation)', () => {
        //let emailSpy = sinon.spy(require('../../../helpers').sendEmail);
        let tokenData = {
            name: 'firstName', email: 'm@m.com', invited: true
        }
        let token = jwt.sign(tokenData, process.env.JWT_SECRET)
        return invoke(token)
            .send(userData)
            .expect(200)
            .expect(res => {
                let { body } = res;
                expect(body).to.be.an('object');
                expect(body.message).to.be.a('string');
                expect(body.user).to.be.an('object');
                expect(body.user.name).to.be.eql(userData.name);
                expect(body.user.email).to.be.eql(userData.email);
                expect(body.user._id).to.be.a('string')
                expect(body.user._id.length).to.be.a('number').eql(24);
                expect(body.user.hashed_password).to.be.a('string');
                expect(body.user.role).to.be.a('string');
                expect(body.user.activated).to.be.false;
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
        let tokenData = {
            name: 'firstName', email: 'm@m.com', invited: true
        }
        let token = jwt.sign(tokenData, process.env.JWT_SECRET)
        return invoke(token)
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
    it('create teacher account if token specifies that the user should be a teacher', () => {
        let tokenData = {
            name: 'firstName', email: 'm@m.com', invited: true, teacher: true
        }
        let token = jwt.sign(tokenData, process.env.JWT_SECRET)
        return invoke(token)
            .send({...userData})
            .expect(200)
            .expect(res => {
                let { body } = res;
                expect(body.user._id).to.be.a('string')
                expect(body.user._id.length).to.be.a('number').eql(24);
                expect(body.user.role).to.be.a('string').eql('teacher');
                expect(body.user.teacherCourses).to.be.a('array');
            })
    })
    it(
        'if token specifies a course invitation, ' +
        'add new user to list of invited teachers for that course and add an additional notification', () => {
        let tokenData = {
            name: 'firstName', email: 'm@m.com', invited: true, teacher: true,
            courseId: course._id, courseName: course.name
        }
        let token = jwt.sign(tokenData, process.env.JWT_SECRET);
        let userId;
        return invoke(token)
            .send({...userData})
            .expect(200)
            .expect(res => {
                let { body } = res;
                expect(body.user._id).to.be.a('string')
                expect(body.user._id.length).to.be.a('number').eql(24);
                expect(body.user.role).to.be.a('string').eql('teacher');
                expect(body.user.notifications).to.be.an('array');
                expect(body.user.notifications.length).to.be.above(1);
                let containsCourseInvitation = false;
                for (let n of body.user.notifications){
                    if (n.type === COURSE_TEACHER_INVITATION){
                        containsCourseInvitation = true;
                        break;
                    }
                }
                expect(containsCourseInvitation).to.be.true;
                userId = body.user._id;
            })
            .then(() => {
                return Course.findOne({_id: course._id})
            })
            .then((course) => {
                expect(course.invitedTeachers).to.be.an('array');
                let hasInvitedNewUser = false;
                for (let t of course.invitedTeachers){
                    if (t.toString() === userId){
                        hasInvitedNewUser = true;
                        break;
                    }
                }
                expect(hasInvitedNewUser).to.be.true;
            })
    })
    it('not create accounts with duplicate email', () => {
        let tokenData = {
            name: 'firstName', email: 'm@m.com', invited: true
        }
        let token = jwt.sign(tokenData, process.env.JWT_SECRET)
        return invoke(token)
            .send(userData)
            .then(() => invoke(token)
                .send(userData)
                .expect(errCallback(403))
            )
    })
});