process.env.NODE_ENV = 'test';

let { app, request, User, expect } = require('../../common');


describe('GET /auth/cur-user', () => {
    let agent = request.agent(app), user
    let userData = {
        name: 'test',
        email: 'maksthepro123@gmail.com',
        password: 'passw1',
        activated: false
    };
    beforeEach(() => {
        return User.remove({})
            .then(() => {
                user = new User(userData);
                return user.save();
            })
    })
    let url = '/auth/cur-user';
    let invoke = () => agent.get(url);
    it('should receive "Not authenticated" if user is not authenticated', () => {
        return invoke()
            .expect((res) => {
                expect(res.body).to.be.a('string').eql('Not authenticated');
            })
    })
    it('should return the correct authenticated user with complete data', () => {
            return agent
                .post('/auth/signin')
                .send({...userData, name: undefined})
                .expect(200)
                .then(() => invoke()
                    .expect(200)
                    .expect(res => {
                        let { body } = res;
                        expect(body).to.be.a('object');
                        expect(body.name).to.be.a('string').eql(user.name);
                        expect(body.email).to.be.a('string').eql(user.email);
                        expect(body.enrolledCourses).to.be.a('array').eql(user.enrolledCourses);
                        expect(body.subscribedCourses).to.be.a('array').eql(user.subscribedCourses);
                        expect(body).not.to.have.property('hashed_password');
                        expect(body).to.have.property('_id').eql(user._id.toString());
                    })
                )
    })
});