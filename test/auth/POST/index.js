process.env.NODE_ENV = 'test';

describe('POST /auth/...', () => {
    require('./signup');
    require('./invite-signup');
    require('./signin');
    require('./send-activation')
})

