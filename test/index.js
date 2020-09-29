process.env.NODE_ENV = 'test';

describe('Tests', () => {
    require('./users');
    require('./auth');
})