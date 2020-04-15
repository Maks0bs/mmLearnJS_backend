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
                    bucketName: 'uploads',
                    metadata: {
                    	uploadedBy: req.auth._id
                    }
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

		console.log('files', files);

		res.json(files);
	}) 
}

exports.fileById = (req, res, next, id) => {
	gfs.files.findOne({_id: mongoose.mongo.ObjectId(id)}, (err, file) => {
		if (err){
			return res.status(400).json({
				error: err
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

exports.allowModifyFile = (req, res, next) => {
	// may need to cast to ObjectId
	if (req.file.metadata.postedBy !== req.auth._id){
		res.status(401).json({
			error: 'you are not authorized to modify this file'
		})
	}
}

exports.setFilename = (req, res, next, filename) => {
	req.originalname = filename;
	next();
}

exports.configStream = (req, res, next) => {
	res.set({
		'Content-Type': req.file.contentType,
		'Content-Disposition': `inline; filename=${req.originalname || 'unknown_name'}`
	})
	next();
}

exports.configDownload = (req, res, next) => {
	res.set({
		'Content-Length': req.file.length,
		//'Content-Type': `attachment; filename=${req.originalname || 'unknown_name'}`
		'Content-Type': 'application/octet-stream'
	})
	next();
}

exports.streamFile = (req, res) => {
	let readStream = gfs.createReadStream(req.file.filename);
	readStream.pipe(res);
}

exports.deleteFile = (req, res) => {
	let objId = mongoose.mongo.ObjectId(req.file._id);
	gfs.remove({_id: objId, root: 'uploads'}, (err, gridStore) => {
		if (err) {
			return res.status(404).json({
				err: err
			})
		}
		else{
			res.json({
				message: 'file deleted successfully'
			})
		}
	});
}

exports.deleteFiles = async (req, res, next) => {
	let cnt = 0;
	if (!req.filesToDelete || req.filesToDelete.length === 0){
		return next();
	}
	for (let i of req.filesToDelete){
		await gfs.remove(
			{
				_id: i,
				root: 'uploads'
			},
			(err, gridStore) => {
				return console.log('deleted file in deleteFiles route', i);
			}
		)
	}

	next();
	
}