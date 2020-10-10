let GridFS = require('gridfs-stream');
let GridFSStorage = require('multer-gridfs-storage');
let multer = require('multer');
let mongoose = require('mongoose');
let crypto = require('crypto');
let constants = require('../constants');

/**
 * @swagger
 * components:
 *   schemas:
 *     Upload.File:
 *       type: object
 *       description: >
 *         File type. Files are stored in MongoDB via GridFS in this API.
 *         See GridFS and Multer docs for details.
 */
/**
 * @class controllers.files
 */

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

/**
 * @type function
 * @description Only works if the request body is a FormData. Uploads all found binary files
 * inside the request FormData; Replaces the `req.body` with an object
 * that contains all original FormData fields and `req.body.files` - an array
 * with metadata about all uploaded files
 * @throws 400
 * @memberOf controllers.files
 */
const uploadFiles = upload.any();
exports.uploadFiles = uploadFiles;

exports.sendFiles = (req, res) => {
	return res.json({ files: req.files})
}

exports.getFilesFiltered = (req, res) => {
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
	let fileId = '';
	try {
		fileId = mongoose.mongo.ObjectId(id);
	} catch (err) {
		return res.status(404).json({
			error: {
				status: 404,
				message: err
			}
		})
	}

	gfs.files.findOne({_id: fileId}, (err, file) => {
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
	console.log('req file', req.file, 'req or name', req.originalname);
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
		'Content-Type': `application/octet-stream filename=${req.originalname || 'unknown_name'}`
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
			return res.json({
				message: 'file deleted successfully'
			})
		}
	});
}

/**
 * @type function
 * @description deletes the files with the IDs, which are specified in the
 * `req.filesToDelete` array;
 * @param {e.Request} req
 * @param {models.User} [req.auth]
 * @param {string|ObjectId[]} [req.filesToDelete]
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.users.usersData
 */
const deleteFiles = async (req, res, next) => {
	if (!req.filesToDelete || req.filesToDelete.length === 0){
		return next();
	}
	await Promise.all(req.filesToDelete.map(id => new Promise(resolve => {
		gfs.remove({_id: id, root: 'uploads'}, () => resolve(id))
	})));
	return next();
}
exports.deleteFiles = deleteFiles;