process.env.NODE_ENV = 'test';

let { app, expect, request } = require('../../common');

describe('GET /users/', () => {
    it('return empty list if no users are available', (done) => {
        request(app)
            .get('/users')
            .expect(200)
            .end((err, res) => {
                expect(res.body).to.be.a('array');
                expect(res.body.length).to.be.eql(0);
                done();
            })
    });
});