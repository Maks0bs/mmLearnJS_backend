process.env.NODE_ENV = 'test';
let User = require('../../users/model')

describe('/auth/...', () => {
    require('./GET');
    require('./POST');
})

