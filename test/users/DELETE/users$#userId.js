process.env.NODE_ENV = 'test';

let { app, expect, User, request, Course, errCallback, getForgedId } = require('../../common');

describe('DELETE /users/:userId', () => {
    let agent = request.agent(app), user, course, course2, teacher;
    let teacherData = {
        name: 'teacher',
        email: 't@m.com',
        password: 'passw1',
        activated: true
    }
    let userData = {
        name: 'test',
        email: 'maksthepro123@gmail.com',
        password: 'passw1',
        about: "Some info about user",
        activated: false,
        subscribedCourses: []
    };
    before(() => {
        return User.remove({})
            .then(() => Course.remove({}))
            .then(() => {
                teacher = new User(teacherData);
                return teacher.save();
            })
            .then(newTeacher => {
                teacher = newTeacher;
                course = new Course({
                    name: 'c1', creator: teacher._id, type: 'open'
                });
                return course.save();
            })
            .then((newCourse) => {
                course = newCourse;
                teacher.teacherCourses = [course._id];
                course2 = new Course({
                    name: 'c2', creator: teacher._id, type: 'open'
                });
                return course2.save();
            })
            .then(newCourse => {
                course2 = newCourse;
                teacher.teacherCourses.push(course2._id);
                return teacher.save();
            })
            .then(newTeacher => {
                teacher= newTeacher;
                return Promise.resolve(true);
            })
    })
    beforeEach(() => {
        // delete only non-activated, because the creator
        // of 2 test courses is activated
        return User.remove({activated: false})
            .then(() => {
                user = new User(userData);
                return user.save()
            })
            .then(() => Course.find({}))
            .then(courses => {
                if (courses[0].name === 'c1'){
                    course = courses[0];
                    course2 = courses[1];
                } else {
                    course = courses[1];
                    course2 = courses[0];
                }
                course.subscribers = [];
                course.students = [];
                course.teachers = [teacher._id];
                course2.subscribers = [];
                course2.students = [];
                course2.teachers = [teacher._id];
                return Promise.all([
                    course.save(), course2.save()
                ]);
            })
    })
    let url = '/users';
    let invoke = (id) => agent.delete(`${url}/${id}`);
    it('Should disallow deleting user if user is not authenticated', () => {
        return invoke(user._id)
            .expect(errCallback(401));
    })
    it('Should not delete users with invalid ID', () => {
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => Promise.all([
                invoke('wrongid')
                    .send({name: ''})
                    .expect(errCallback(400)),
                invoke(getForgedId(user._id.toString()))
                    .expect(errCallback(404))
            ]))
    })
    it('should delete the user and all reference to them', () => {
        user.subscribedCourses = [
            {lastVisited: new Date(), course: course._id},
            {lastVisited: new Date(), course: course2._id}
        ]
        course.subscribers = [user._id]
        course2.subscribers = [user._id]
        user.enrolledCourses = [course._id];
        course.students = [user._id];
        user.teacherCourses = [course2._id];
        course2.teachers = [teacher._id, user._id];
        return Promise.all([
            user.save(), course.save(), course2.save()
        ])
            .then(() => agent
                .post('/auth/signin')
                .send({...userData, name: undefined})
                .expect(200)
                .then(() => invoke(user._id.toString())
                    .expect(200)
                    .then(() => {
                        return User.find({activated: false})
                    })
                    .then(users => {
                        expect(users).to.be.an('array');
                        expect(users.length).to.be.eql(0);
                        return Course.findOne({name: 'c1'})
                    })
                    .then(course => {
                        expect(course.students).to.be.an('array');
                        expect(course.students.length).to.be.eql(0);
                        expect(course.subscribers).to.be.an('array');
                        expect(course.subscribers.length).to.be.eql(0);
                        return Course.findOne({name: 'c2'})
                    })
                    .then(course => {
                        expect(course.teachers).to.be.an('array');
                        expect(course.teachers.length).to.be.eql(1);
                        expect(course.subscribers).to.be.an('array');
                        expect(course.subscribers.length).to.be.eql(0);
                    })
                )
            )

    })
    it(
        'If only teacher (who is the creator) of the course is deleted, ' +
        'replace the creator in the course with a new admin and notify maks0bs',
        () => {
        return agent
            .post('/auth/signin')
            .send({...teacherData, name: undefined})
            .expect(200)
            .then(() => invoke(teacher._id.toString())
                .expect(200)
                .then(() => {
                    return User.find({activated: true})
                })
                .then(users => {
                    expect(users).to.be.an('array');
                    expect(users.length).to.be.eql(0);
                    return Course.find({})
                        .populate('teachers', '_id name role')
                        .populate('creator', '_id name role')
                })
                .then(courses => {
                    expect(courses).to.be.an('array');
                    expect(courses.length).to.be.eql(2)
                    expect(courses[0].creator).to.be.an('object');
                    expect(courses[0].creator.role).to.be.eql('admin');
                    expect(courses[1].creator).to.be.an('object');
                    expect(courses[1].creator.role).to.be.eql('admin');
                    expect(courses[0].teachers).to.be.an('array');
                    expect(courses[0].teachers.length).to.be.eql(1);
                    expect(courses[0].teachers[0]).to.be.eql(courses[0].creator);
                    expect(courses[1].teachers).to.be.an('array');
                    expect(courses[1].teachers.length).to.be.eql(1);
                    expect(courses[1].teachers[0]).to.be.eql(courses[1].creator);
                })
            )
    })
});