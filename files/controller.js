let GridFS = require('gridfs-stream');
let GridFSStorage = require('multer-gridfs-storage');
let multer = require('multer');
let mongoose = require('mongoose');
let crypto = require('crypto');
let constants = require('../constants');

let gfs;
mongoose.connection.on('open', () => {
    gfs = GridFS(mongoose.connection.db, mongoose.mongo);
    gfs.collection('uploads');
})
let storage = new GridFSStorage({
    url: constants.database.MONGODB_URI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                let filename = buf.toString('hex');
                let fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                }
                resolve(fileInfo);
            })
        })
    }
})
let upload = multer({ storage });

exports.uploadFiles = upload.array('files', constants.database.FILES_UPLOAD_LIMIT)

exports.sendFiles = (req, res) => {
	res.json({
		files: req.files
	})
}

exports.getFileById = (req, res) => {
	gfs.files.findOne({_id: req.fileId})
	.then(file => {
		if (!file || file.length === 0){
			throw {
				status: 404,
				message: 'file does not exist'
			}
		}

		res.json(file);
	})
	.catch(err => {
		console.log(err);
		return res.status(err.status || 400)
			.json({
				error: err
			})
	}) 
}