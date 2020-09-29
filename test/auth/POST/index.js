process.env.NODE_ENV = 'test';

let User = require('../../../users/model')
describe('GET /users/...', () => {
    beforeEach((done) => {
        User.remove({}, () => done())
    })
    require('./signup');
})

