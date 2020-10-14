process.env.NODE_ENV = 'test';

let { app, expect, request, User, errCallback, verifyAuthCookie, getGFS, mongoose, getForgedId } = require('../../common');


describe('GET /files/stream/:fileId', () => {
    let agent = request.agent(app), user;
    let userData = {
        name: 'test',
        email: 'maksthepro123@gmail.com',
        password: 'passw1',
        activated: false
    };
    beforeEach(() => {
        return User.remove({})
            .then(() =>
                mongoose.connection.db.dropDatabase()
            )
            .then(() => {
                user = new User(userData);
                return user.save();
            })
    })
    let url = '/files/stream';
    let invoke = (id) => agent.get(`${url}/${id}`);
    it('should throw error if file ID is invalid', () => {
        let file;
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => {
                return agent
                    .post('/files/upload')
                    .attach('files', 'test/resources/pdf1.pdf')
                    .expect(200)
                    .expect(res => {
                        file = res.body.files[0];
                    })
            })
            .then(() => {
                return Promise.all([
                    invoke(getForgedId(file.id))
                        .expect(errCallback(404)),
                    invoke(getForgedId('wrongid'))
                        .expect(errCallback(400))
                ])
            })
    })
    it('should send file with correct headers', () => {
        let file;
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => {
                return agent
                    .post('/files/upload')
                    .attach('files', 'test/resources/pdf1.pdf')
                    .expect(200)
                    .expect(res => {
                        file = res.body.files[0];
                    })
            })
            .then(() => {
                return invoke(file.id)
                    .expect(200)
                    .expect(res => {
                        expect(res.headers['content-type']).to.be.eql(
                            'application/pdf'
                        )
                    })
            })
    })
});