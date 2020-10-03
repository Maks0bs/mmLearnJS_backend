process.env.NODE_ENV = 'test';

let { app, expect, request, User, errCallback, verifyAuthCookie } = require('../../common');


describe('POST /auth/forgot-password', () => {
    //TODO check if email was sent
    let agent = request.agent(app);
    let userData = {
        name: 'test',
        email: 'maksthepro123@gmail.com',
        password: 'passw1'
    };
    beforeEach(() => {
        return User.remove({})
            .then(() => {
                let user = new User(userData);
                return user.save();
            })
    })
    let url = '/auth/forgot-password';
    let invoke = () => agent.post(url);
    it('should not do anything if there is no email or it is wrong', () => {
        return Promise.all([
            invoke()
                .send()
                .expect(errCallback(400)),
            invoke()
                .send({email: undefined})
                .expect(errCallback(400)),
            invoke()
                .send({email: 'wrong@email.com'})
                .expect(errCallback(404))
        ])
    })
    it('should send a link to reset password if email is correct', () => {
        return invoke()
            .send({email: userData.email})
            .expect(200)
            .expect(res => {
                let {body} = res;
                expect(body).to.be.an('object');
                expect(body.message).to.be.a('string');
            })
    })
});