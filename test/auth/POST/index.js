process.env.NODE_ENV = 'test';

let User = require('../../../users/model')
describe('POST /auth/...', () => {
    beforeEach((done) => {
        User.remove({}, () => done())
    })
    require('./signup');
})

