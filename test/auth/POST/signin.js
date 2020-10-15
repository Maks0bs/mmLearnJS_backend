process.env.NODE_ENV = 'test';

let { app, expect, request, User, errCallback, verifyAuthCookie } = require('../../common');


describe('POST /auth/signin', () => {
    let agent = request.agent(app);
    let userData = { name: 'test', email: 'maksthepro123@gmail.com', password: 'passw1'};
    beforeEach(() => {
        return User.remove({})
            .then(() => {
                let user = new User(userData);
                return user.save();
            })
    })
    let url = '/auth/signin';
    let invoke = () => agent.post(url);
    it('should not accept false credentials for authentication', () => {
        return Promise.all([
            invoke()
                .send({...userData, email: 'mnone@m.com', name: undefined})
                .expect(errCallback(400)),
            invoke()
                .send({...userData, password: 'passw2', name: undefined})
                .expect(errCallback(401))
        ])
    })
    it('should authenticate user via setting cookies', () => {
        return invoke()
            .send(userData)
            .expect(200)
            .expect((res) => {
                expect(res.headers).to.be.an('object');
                let { headers } = res;
                expect(headers['set-cookie']).to.be.an('array');
                let cookies = headers['set-cookie'] || headers['Set-Cookie'];
                expect(cookies.length).to.be.above(0);
                let hasAuthCookie = false;
                for (let c of cookies){
                    expect(c).to.be.a('string');
                    if (c.length > 5){
                        if (c.substring(0, 5) === 'auth=' && /[\w.]/.test(c[5])){
                            hasAuthCookie = true;
                        }
                    }
                }
                expect(hasAuthCookie).to.be.eql(true);
            })
    })

});