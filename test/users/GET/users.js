process.env.NODE_ENV = 'test';

let { app, chai, expect } = require('../../common');

describe('GET /users/', () => {
    it('check with empty users list', (done) => {
        chai.request(app)
            .get('/users')
            .end((err, res) => {
                res.should.have.status(200);
                expect(res.body).to.be.a('array');
                expect(res.body.length).to.be.eql(0);
                done();
            })
    });
});