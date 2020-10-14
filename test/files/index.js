process.env.NODE_ENV = 'test';

describe('/files/...', () => {
    require('./GET');
    require('./POST');
})

