process.env.NODE_ENV = 'test';

let { app, expect, request, User, errCallback, verifyAuthCookie } = require('../../common');


describe('POST /auth/send-activation', () => {
    let agent = request.agent(app);
    let userData = {
        name: 'test',
        email: 'maksthepro123@gmail.com',
        password: 'passw1',
        activated: false
    };
    beforeEach(() => {
        return User.remove({})
            .then(() => {
                let user = new User(userData);
                return user.save();
            })
    })
    let url = '/auth/send-activation';
    let invoke = () => agent.post(url);
    it('should not activated if user is not authenticated', () => {
        return invoke()
            .send()
            .expect(errCallback(401))
    })
    it('should not send activation to an already activated account', () => {
        return User.updateOne({email: userData.email}, {$set: {activated: true}})
            .then(() => {
                return agent
                    .post('/auth/signin')
                    .send({...userData, name: undefined})
                    .expect(200)
            })
            .then(() => invoke()
                // no need to set cookies manually, it is done automatically,
                // most likely by the agent
                .send()
                .expect(errCallback(403))
            )
    })
    it('should send activation correctly to non-activated users', () => {
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => invoke()
                // no need to set cookies manually, it is done automatically,
                // likely by the agent
                .send()
                .expect(200)
            )
    })


});