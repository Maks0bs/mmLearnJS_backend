process.env.NODE_ENV = 'test';

let User = require('../../../users/model')
describe('PUT /users/...', () => {
    beforeEach(() => {
        return User.remove({});
    })
    require('./users$#userId');
})

