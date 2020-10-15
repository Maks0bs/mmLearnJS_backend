process.env.NODE_ENV = 'test';

let { app, expect, User, request, Course, errCallback, getForgedId } = require('../../common');

describe('GET /users/updates-by-date', () => {
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
                    name: 'c1', creator: teacher._id, type: 'open',
                    updates: [
                        {created: new Date(2000, 2, 2, 2, 2, 2)},
                        {created: new Date(2000, 2, 3, 2, 2, 2)},
                        {created: new Date(2000, 2, 4, 2, 2, 2)},
                        {created: new Date(2000, 2, 5, 2, 2, 2)},
                        {created: new Date(2000, 2, 6, 2, 2, 2)},
                    ]
                });
                return course.save();
            })
            .then((newCourse) => {
                course = newCourse;
                course2 = new Course({
                    name: 'c2', creator: teacher._id, type: 'open',
                    updates: [
                        {created: new Date(2000, 2, 4, 3, 2, 2)},
                        {created: new Date(2000, 2, 5, 3, 2, 2)},
                        {created: new Date(2000, 2, 6, 3, 2, 2)},
                        {created: new Date(2000, 2, 7, 3, 2, 2)},
                        {created: new Date(2000, 2, 8, 3, 2, 2)},
                    ]
                });
                return course2.save();
            })
            .then(newCourse => {
                course2 = newCourse;
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
            .then(() => {
                course.subscribers = [];
                course2.subscribers = [];
                return Promise.all([
                    course.save(), course2.save()
                ])
            })
    })
    let url = '/users/updates-by-date';
    let invoke = (query) => agent.get(`${url}/${query}`);
    it('Should throw error if user is not authenticated', () => {
        return invoke(`?courses=${course._id}&dateFrom=2000-03-02&dateTo=2000-03-03&starting=0&cnt=2`)
            .expect(errCallback(401));
    })
    it('Should not return any updates query params are invalid', () => {
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => {
                course.subscribers = [user._id];
                user.subscribedCourses = [{course: course._id, lastVisited: new Date()}]
                return Promise.all([course.save(), user.save()])
            })
            .then(() => {
                return Promise.all([
                    invoke(`?courses=${course._id}&dateFrom=2000-03-02&dateTo=2000-03-05&starting=gf&cnt=2`)
                        .expect(200)
                        .expect(res => {
                            expect(res.body).to.be.eql([]);
                        }),
                    invoke(`?courses=${course._id}&dateFrom=2000-03-02&dateTo=2000-03-05&starting=1&cnt=gsdf`)
                        .expect(200)
                        .expect(res => {
                            expect(res.body).to.be.eql([]);
                        }),
                    invoke(`?courses=${course._id}&dateFrom=2000-03-02&dateTo=2000-02-05&starting=0&cnt=2`)
                        .expect(200)
                        .expect(res => {
                            expect(res.body).to.be.eql([]);
                        }),
                    invoke(`?courses=${course._id}&dateFrom=2000-03-fd&dateTo=2000-03-05&starting=0&cnt=2`)
                        .expect(200)
                        .expect(res => {
                            expect(res.body).to.be.eql([]);
                        }),
                    invoke(`?courses=${course._id}&dateFrom=2000-gf&dateTo=2000-03-05&starting=0&cnt=2`)
                        .expect(200)
                        .expect(res => {
                            expect(res.body).to.be.eql([]);
                        }),
                    invoke(`?courses=${course._id}&dateFrom=2000-03-02&dateTo=2000-sd-05&starting=0&cnt=2`)
                        .expect(200)
                        .expect(res => {
                            expect(res.body).to.be.eql([]);
                        }),
                    invoke(`?courses=${course._id}&dateFrom=fsdjkfj&dateTo=2000-sd-05&starting=0&cnt=2`)
                        .expect(200)
                        .expect(res => {
                            expect(res.body).to.be.eql([]);
                        }),
                ])
            })
    })
    it('Should not return any updates if user is not subscribed to the mentioned in query course', () => {
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => {
                course.subscribers = [user._id];
                user.subscribedCourses = [{course: course._id, lastVisited: new Date()}]
                return Promise.all([course.save(), user.save()])
            })
            .then(() => {
                return invoke(`?courses=${course2._id}&dateFrom=2000-03-02&dateTo=2000-03-10&starting=0&cnt=2`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body).to.be.eql([]);
                    })
            })
    })
    it('Should throw error if no courses were found with given ids, or if the ids are invalid', () => {
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => {
                course.subscribers = [user._id];
                user.subscribedCourses = [{course: course._id, lastVisited: new Date()}]
                return Promise.all([course.save(), user.save()])
            })
            .then(() => {
                return Promise.all([
                    invoke(`?courses=${getForgedId(course._id.toString())}&dateFrom=2000-03-02&dateTo=2000-03-10&starting=0&cnt=2`)
                        .expect(200)
                        .expect(res => {
                            expect(res.body).to.be.eql([]);
                        }),
                    invoke(`?courses=${'wrongid'}&dateFrom=2000-03-02&dateTo=2000-03-10&starting=0&cnt=2`)
                        .expect(errCallback(400))
                ])
            })
    })
    it('Should return correct updates', () => {
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => {
                course.subscribers = [user._id];
                course2.subscribers = [user._id];
                user.subscribedCourses = [
                    {course: course._id, lastVisited: new Date()},
                    {course: course2._id, lastVisited: new Date()}
                ]
                return Promise.all([course.save(), user.save(), course2.save()])
            })
            .then(() => {
                return Promise.all([
                    invoke(`?courses=${course._id}&courses=${course2._id}&dateFrom=2000-03-01&dateTo=2000-03-10&starting=0&cnt=50`)
                        .expect(200)
                        .expect(res => {
                            let {body} = res;
                            expect(body).to.be.an('array');
                            expect(body.length).to.be.eql(10);
                        }),
                    invoke(`?courses=${course._id}&courses=${course2._id}&dateFrom=2000-03-01&dateTo=2000-03-10&starting=0&cnt=4`)
                        .expect(200)
                        .expect(res => {
                            let {body} = res;
                            expect(body).to.be.an('array');
                            expect(body.length).to.be.eql(4);
                        }),
                    invoke(`?courses=${course._id}&courses=${course2._id}&dateFrom=2000-03-01&dateTo=2000-03-10&starting=5&cnt=4`)
                        .expect(200)
                        .expect(res => {
                            let {body} = res;
                            expect(body).to.be.an('array');
                            expect(body.length).to.be.eql(4);
                        }),
                    invoke(`?courses=${course._id}&courses=${course2._id}&dateFrom=2000-03-01&dateTo=2000-03-10&starting=8&cnt=5`)
                        .expect(200)
                        .expect(res => {
                            let {body} = res;
                            expect(body).to.be.an('array');
                            expect(body.length).to.be.eql(2);
                        }),
                    invoke(`?courses=${course._id}&courses=${course2._id}&dateFrom=2000-03-03&dateTo=2000-03-05&starting=0&cnt=10`)
                        .expect(200)
                        .expect(res => {
                            let {body} = res;
                            expect(body).to.be.an('array');
                            expect(body.length).to.be.eql(5);
                        }),
                    invoke(`?courses=${course._id}&courses=${course2._id}&dateFrom=2000-03-01&dateTo=2000-03-02&starting=0&cnt=10`)
                        .expect(200)
                        .expect(res => {
                            let {body} = res;
                            expect(body).to.be.an('array');
                            expect(body.length).to.be.eql(1);
                        }),
                    invoke(`?courses=${course._id}&courses=${course2._id}&dateFrom=2000-03-08&dateTo=2000-03-10&starting=0&cnt=10`)
                        .expect(200)
                        .expect(res => {
                            let {body} = res;
                            expect(body).to.be.an('array');
                            expect(body.length).to.be.eql(1);
                        }),
                    invoke(`?courses=${course._id}&courses=${course2._id}&dateFrom=2000-03-01&dateTo=2000-03-10&starting=0&cnt=10`)
                        .expect(200)
                        .expect(res => {
                            let {body} = res;
                            expect(body).to.be.an('array');
                            expect(body.length).to.be.eql(10);
                            // check contents of array
                            let update = body[0];
                            expect(update.data.created).to.be.a('string');
                            expect(update.course.id).to.be.eql(course2._id.toString());
                            expect(update.course.name).to.be.eql(course2.name);
                            update = body[9];
                            expect(update.data.created).to.be.a('string');
                            expect(update.course.id).to.be.eql(course._id.toString());
                            expect(update.course.name).to.be.eql(course.name);
                        }),
                ])
            })
    })
});