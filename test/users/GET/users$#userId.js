process.env.NODE_ENV = 'test';

let { app, expect, User, request, Course, errCallback, getForgedId } = require('../../common');

describe('GET /users/:userId', () => {
    let agent = request.agent(app), user, course;
    let teacherData = {
        name: 'teacher',
        email: 't@m.com',
        password: 'passw1',
    }
    let userData = {
        name: 'test',
        email: 'maksthepro123@gmail.com',
        password: 'passw1',
        about: "Some info about user",
        activated: false
    };
    before(() => {
        return User.remove({})
            .then(() => Course.remove({}))
            .then(() => {
                let teacher = new User(teacherData);
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
    beforeEach(() => {
        return User.remove({})
            .then(() => {
                user = new User(userData);
                user.enrolledCourses = [course._id];
                user.hiddenFields = ['email', 'enrolledCourses', 'created'];
                return user.save();
            })
    })
    let url = '/users';
    let invoke = (id) => agent.get(`${url}/${id}`);
    it('Should throw error if user with given id does not exist', () => {
        return Promise.all([
            invoke('wrongid')
                .expect(errCallback(400)),
            invoke(getForgedId(user._id.toString()))
                .expect(errCallback(404))
        ])
    })
    it('GET a user by the given id and display non-hidden fields', () => {
        return invoke(user._id.toString())
            .expect(200)
            .expect(res => {
                let { body } = res;
                expect(body).to.be.an('object');
                expect(body.name).to.be.eql(userData.name);
                expect(body.about).to.be.eql(userData.about);
                expect(body.role).to.be.eql('student');
                expect(body.activated).to.be.false;
                expect(body._id).to.be.a('string').eql(user._id.toString());
            })
    })
    it('GET a user but not display fields which the user decided to hide', () => {
        return invoke(user._id.toString())
            .expect(200)
            .expect(res => {
                let { body } = res;
                console.log(res.body);
                expect(body).to.be.an('object');
                expect(body._id).to.be.a('string').eql(user._id.toString());
                expect(body).to.not.have.own.property('enrolledCourses');
                expect(body).to.not.have.own.property('email');
                expect(body).to.not.have.own.property('created');
                expect(body).to.not.have.own.property('notifications');
                expect(body).to.not.have.own.property('subscribedCourses');
            })
    });
    it('GET a user and display ALL fields if this user is the authenticated one', () => {
        return agent
            .post('/auth/signin')
            .send({email: 'maksthepro123@gmail.com', password: 'passw1'})
            .expect(200)
            .then(() => invoke(user._id.toString())
                .expect(200)
                .expect(res => {
                    let { body } = res;
                    expect(body).to.be.an('object');
                    expect(body._id).to.be.a('string').eql(user._id.toString());
                    expect(body.enrolledCourses).to.be.eql(
                        user.enrolledCourses.map(c => ({_id: c._id.toString(), name: course.name}))
                    )
                    expect(body.email).to.be.eql(user.email);
                    expect(body.created).to.be.a('string');
                })
            )
    });

});