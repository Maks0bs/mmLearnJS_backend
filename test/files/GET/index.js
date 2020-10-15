process.env.NODE_ENV = 'test';

describe('GET /files/...', () => {
    require('./download')
    require('./stream')
})

