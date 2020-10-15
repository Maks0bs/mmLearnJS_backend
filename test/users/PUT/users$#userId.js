process.env.NODE_ENV = 'test';

let { app, expect, User, request, Course, errCallback, getForgedId } = require('../../common');

describe('PUT /users/:userId', () => {
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
                return user.save();
            })
    })
    let url = '/users';
    let invoke = (id) => agent.put(`${url}/${id}`);
    it('Should not allow unauthenticated users to update another user', () => {
        return invoke(user._id.toString())
            .expect(errCallback(401))
    })
    it('Should not update users with invalid ID', () => {
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
    it('Should not send invalid data (name, password, etc)', () => {
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => Promise.all([
                invoke(user._id.toString())
                    .field('user', JSON.stringify({
                        name: '',
                        about: '',
                        hiddenFields: []
                    }))
                    .expect(errCallback(400)),
                invoke(user._id.toString())
                    .field('user', JSON.stringify({
                        name: 'a',
                        about: '',
                        hiddenFields: ['name']
                    }))
                    .expect(errCallback(400)),
                invoke(user._id.toString())
                    .field('user', JSON.stringify({
                        name: 'a',
                        about: '',
                        hiddenFields: [],
                        password: 'passw3',
                        oldPassword: 'passw2'
                    }))
                    .expect(errCallback(401)),
                invoke(user._id.toString())
                    .field('user', JSON.stringify({
                        name: 'a',
                        about: '',
                        hiddenFields: [],
                        password: 'passwww',
                        oldPassword: 'passw1'
                    }))
                    .expect(errCallback(400)),
                invoke(user._id.toString())
                    .field('user', JSON.stringify({
                        name: 'a',
                        about: '',
                        hiddenFields: [],
                        password: 'pass1',
                        oldPassword: 'passw1'
                    }))
                    .expect(errCallback(400)),
                invoke(user._id.toString())
                    .field('user', JSON.stringify({
                        name: 'a',
                        about: '',
                        hiddenFields: [],
                        photo: 'new'
                    }))
                    .attach('files', 'test/resources/pdf1.pdf')
                    .expect(errCallback(400))
            ]))
    })
    it('Should explicitly remove image on demand', () => {
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => invoke(user._id.toString())
                .field('user', JSON.stringify({
                    name: 'test upd1',
                    about: 'new about',
                    hiddenFields: ['email', 'created'],
                    photo: 'new'
                }))
                .attach('files', 'test/resources/photo1.jpg')
                .expect(200)
                .then(() => invoke(user._id.toString())
                    .field('user', JSON.stringify({
                        name: 'test upd1',
                        about: 'new about',
                        hiddenFields: ['email', 'created'],
                        photo: null
                    }))
                    .expect(200)
                    .expect(res => {
                        let {body} =res;
                        expect(body).to.be.an('object');
                        expect(body.user).to.be.an('object');
                        expect(body.user.photo).to.be.null;
                    })
                )
            )
    })
    it('Should update the user with new provided data', () => {
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => invoke(user._id.toString())
                .field('user', JSON.stringify({
                    name: 'test upd1',
                    about: 'new about',
                    hiddenFields: ['email', 'created'],
                    photo: 'new',
                    password: 'passw3',
                    oldPassword: 'passw1'
                }))
                .attach('files', 'test/resources/photo1.jpg')
                .expect(200)
                .expect(res => {
                    expect(res.body).to.be.an('object');
                    let { body } = res;
                    expect(body.user).to.be.an('object');
                    expect(body.message).to.be.a('string');
                    let {user: fetchedUser } = body;
                    expect(fetchedUser.name).to.be.eql('test upd1');
                    expect(fetchedUser.about).to.be.eql('new about');
                    expect(fetchedUser.photo).to.be.a('string').length(24);
                    expect(fetchedUser.hiddenFields).to.be.eql(['email', 'created'])
                })
                .then(() => User.findOne({_id: user._id}))
                .then(newUser =>{
                    expect(newUser.checkCredentials('passw3')).to.be.eql(true)
                })
            )
    })

});