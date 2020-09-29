process.env.NODE_ENV = 'test';

let { app, chai, expect, User } = require('../../common');

describe('GET /users/:userId', () => {
    it('it should GET a users by the given id', (done) => {
        let user = new User({ name: 'test', email: 'm@m.com', password: 'passw1'});
        user.save((err, user) => {
            chai.request(app)
                .get(`/users/${user._id}`)
                .end((err, res) => {
                    res.should.have.status(200);
                    let { body } = res;
                    expect(body).to.be.a('object');
                    expect(body).to.have.property('name');
                    expect(body).to.have.property('email');
                    expect(body).not.to.have.property('hashed_password');
                    expect(body).to.have.property('_id').eql(user._id.toString());
                    done();
                })
        });
    });
});