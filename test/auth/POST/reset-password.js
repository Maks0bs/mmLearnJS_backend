process.env.NODE_ENV = 'test';

let jwt = require('jsonwebtoken')
let { app, expect, request, User, errCallback, verifyAuthCookie } = require('../../common');


describe('POST /auth/reset-password/:resetToken', () => {
    //TODO check if email was sent
    let agent = request.agent(app), user;
    let userData = {
        name: 'test',
        email: 'maksthepro123@gmail.com',
        password: 'passw1'
    };
    beforeEach(() => {
        return User.remove({})
            .then(() => {
                user = new User(userData);
                return user.save();
            })
    })
    let url = '/auth/reset-password';
    let invoke = (token) => agent.post(`${url}/${token}`);
    it('should not accept wrong password', () => {
        let tokenData = {
            _id: user._id, email: user.email, role: user.role
        }
        let token = jwt.sign(tokenData, process.env.JWT_SECRET)
        return Promise.all([
            invoke(token)
                .send({newPassword: 'passwww'})
                .expect(errCallback(400)),
            invoke(token)
                .send({newPassword: 'pass1'})
                .expect(errCallback(400)),
            invoke(token)
                .send()
                .expect(errCallback(400))
        ])
    })
    it('should not change password if token is invalid/old', () => {
        let tokenData = {
            _id: user._id, email: user.email, role: user.role
        }
        let tokenInvalid = jwt.sign(tokenData, 'wrongsecret')
        let tokenOld = jwt.sign(
            {...tokenData, iat: Math.floor(Date.now() / 1000) - 30},
            process.env.JWT_SECRET,
            { expiresIn: 15}
        )
        return Promise.all([
            invoke(tokenInvalid)
                .send({newPassword: 'passw2'})
                .expect(errCallback(401)),
            invoke(tokenOld)
                .send({newPassword: 'passw2'})
                .expect(errCallback(401)),
        ])
    })
    it('should not change password if data in token is wrong', () => {
        let tokenData = {
            _id: user._id, email: user.email, role: user.role
        }
        let strId = user._id.toString(), wrongId
        if (strId[strId.length - 1] === 'a'){
            wrongId = strId.substring(0, strId.length - 1) + 'b';
        } else {
            wrongId = strId.substring(0, strId.length - 1) + 'a';
        }
        let wrongEmail = "wrong@email.com", wrongRole = "admin";
        let token1 = jwt.sign({...tokenData, _id: wrongId}, process.env.JWT_SECRET);
        let token2 = jwt.sign({...tokenData, email: wrongEmail}, process.env.JWT_SECRET);
        let token3 = jwt.sign({...tokenData, role: wrongRole}, process.env.JWT_SECRET);
        return Promise.all([
            invoke(token1)
                .send({newPassword: 'passw2'})
                .expect(errCallback(404)),
            invoke(token2)
                .send({newPassword: 'passw2'})
                .expect(errCallback(404)),
            invoke(token3)
                .send({newPassword: 'passw2'})
                .expect(errCallback(404))
        ])
    })
    it('should change password if token is correct and password is valid', () => {
        let tokenData = {
            _id: user._id, email: user.email, role: user.role
        }

        let token = jwt.sign(tokenData, process.env.JWT_SECRET);
        return invoke(token)
            .send({newPassword: 'passw2'})
            .expect(200)
            .then(() => {
                return User.findOne({_id: user._id})
            })
            .then(newUser => {
                expect(newUser.checkCredentials('passw2')).to.be.true;
            })
    })
});