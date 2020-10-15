process.env.NODE_ENV = 'test';
let User = require('../../users/model')

describe('/users/...', () => {
    beforeEach((done) => {
        User.remove({}, () => done())
    })
    require('./GET');
})

