process.env.NODE_ENV = 'test';

let User = require('../../../users/model')
describe('GET /users/...', () => {
    beforeEach(() => {
        return User.remove({});
    })
    require('./users$#userId');
    require('./users');
    require('./updates-by-date');
})

