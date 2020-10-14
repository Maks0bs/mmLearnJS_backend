process.env.NODE_ENV = 'test';

describe('Tests', () => {
    require('./users');
    require('./auth');
    require('./files');
})

// one way to test if email is sent: create a sinon.stub which has absolutely the same code
// as helpers.sendEmail. The email gets sent, check the return value of the first call of the function
// via sinon.spy methods