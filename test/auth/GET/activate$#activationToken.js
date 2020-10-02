process.env.NODE_ENV = 'test';

let jwt = require('jsonwebtoken')
let { app, expect, request, User, errCallback, verifyAuthCookie } = require('../../common');


describe('GET /auth/activate/:activationToken', () => {
    let agent = request.agent(app), correctToken, user
    let userData = { name: 'test', email: 'maksthepro123@gmail.com', password: 'passw1'};
    beforeEach(() => {
        return User.remove({})
            .then(() => {
                user = new User(userData);
                return user.save();
            })
            .then(user => {
                correctToken = jwt.sign(
                    {_id: user._id, email: user.email},
                    process.env.JWT_SECRET
                )
            })
    })
    let invoke = (url) => agent.get(url);
    it('should not work with correct encrypted data, but false secret was used during encryption', () => {
        let wrongToken = jwt.sign(
            {_id: user._id, email: user.email},
            'wrongsecret'
        )
        let url = `/auth/activate/${wrongToken}`;
        return invoke(url)
            .expect(errCallback(401))
    })
    it('should not work with incorrect encrypted data (secret is correct)', () => {
        let wrongToken = jwt.sign(
            {_id: user._id, email: 'wrong@email.com'},
            process.env.JWT_SECRET
        )
        let url = `/auth/activate/${wrongToken}`;
        return invoke(url)
            .expect(errCallback(404))
    })
    it('should work with correct encrypted data, encrypted with the correct secret', () => {
        let url = `/auth/activate/${correctToken}`;
        return invoke(url)
            .expect(200)
            .then(() => {
                return User.findOne({ _id: user._id })
            })
            .then(newUser => {
                expect(newUser._id).to.be.eql(user._id);
                expect(newUser.activated).to.be.eql(true);
            })
    })

});