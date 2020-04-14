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

exports.getFilesFiltered = (req, res) => {
	console.log('body',req.body);
	let filter = {}
	if (req.body.fileId){
		filter._id = mongoose.mongo.ObjectId(req.body.fileId);
	}
	gfs.files.find(filter).toArray((err, files) =>{
		if (err) {
			return res.status(400).json({
				error: err
			})
		}

		if (!files || files.length === 0){
			return res.status(404).json({
				error: {
					status: 404,
					message: 'files do not exist'
				}
			})
		}

		console.log(files);

		res.json(files);
	}) 
}

exports.setFilename = (req, res, next) => {
	if (req.params.filename){
		req.filename = req.params.filename;
	}
	else if (req.body && req.body.filename){
		req.filename = req.body.filename;
	}
	next();
}

exports.configDownload = (req, res, next) => {
	res.set({
		'Content-Disposition': `attachment; filename=${req.filename || 'unknown_name'}`
	})
	next();
}

exports.fileById = (req, res, next, id) => {
	gfs.files.findOne({_id: mongoose.mongo.ObjectId(id)}, (err, file) => {
		if (err){
			return res.status(400).json({
				error: err;
			})
		}

		if (!file || file.length === 0){
			return res.status(404).json({
				status: 404,
				error: 'no such file exists'
			})
		}

		req.file = file;
		next();
	})
}

exports.streamFileById = (req, res) => {
	/*res.set({
		'Accept-Ranges': 'bytes',
		'Content-Disposition': `attachment; filename=${req.params.fileId}`
		content-type: specify it here 
	})*/
	let filter = {};
	let id = req.params.fileId;
	filter._id = mongoose.mongo.ObjectId(id);
	console.log('filter------- ', filter)
	gfs.files.findOne(filter, (err, file) => {
		if (err){
			return res.status(400).json({
				error: err
			})
		}
		if (!file || file.length === 0) {
			console.log('stuff')
			return res.status(404).json({
				status: 404,
				error: 'no such file exists'
			})
		}

		res.set({
			'Content-Length': file.length
		})

		let readStream = gfs.createReadStream(file.filename);
		readStream.pipe(res);
	})
}