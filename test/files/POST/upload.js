process.env.NODE_ENV = 'test';

let { app, expect, request, User, errCallback, verifyAuthCookie, getGFS, mongoose } = require('../../common');


describe('POST /files/upload', () => {
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
    let url = '/files/upload';
    let invoke = () => agent.post(url);
    it('should not upload if user is not authenticated', () => {
        return request(app).post(url)
            .attach('files', 'test/resources/pdf1.pdf')
            .expect(401)
            .expect(errCallback(401))
    })
    it('should upload files, save them to db and send metadata', () => {
        //TODO check if files are saved
        //!this is then checked by other endpoints
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => {
                return invoke()
                    .attach('files', 'test/resources/pdf1.pdf')
                    .expect(200)
                    .expect(res => {
                        let {body} = res;
                        expect(body).to.be.an('object');
                        expect(body.files).to.be.an('array');
                        expect(body.files.length).to.be.eql(1);
                        let file = body.files[0];
                        expect(file).to.be.an('object');
                        expect(file.contentType).to.be.eql('application/pdf');
                        expect(file.metadata).to.be.an('object');
                        expect(file.metadata.uploadedBy).to.be.eql(user._id.toString())
                        expect(file.metadata.originalName).to.be.eql('pdf1.pdf');
                    })
            })
    })
    it('should upload multiple files', () => {
        return agent
            .post('/auth/signin')
            .send({...userData, name: undefined})
            .expect(200)
            .then(() => {
                return invoke()
                    .attach('files', 'test/resources/pdf1.pdf')
                    .attach('files', 'test/resources/photo1.jpg')
                    .expect(200)
                    .expect(res => {
                        let { body } = res;
                        expect(body).to.be.an('object');
                        expect(body.files).to.be.an('array');
                        expect(body.files.length).to.be.eql(2);
                        expect(body.files[0].contentType).to.be.eql('application/pdf');
                        expect(body.files[1].contentType).to.be.eql('image/jpeg');
                    })
            })
    })
});