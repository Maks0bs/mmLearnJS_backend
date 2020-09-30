process.env.NODE_ENV = 'test';
let User = require('../../users/model')

describe('/auth/...', () => {
    beforeEach((done) => {
        User.remove({}, () => done())
    })
    require('./POST');
})

