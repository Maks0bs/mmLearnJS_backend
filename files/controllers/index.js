let multer = require('multer');
let mongoose = require('mongoose');
let { ObjectId } = mongoose.Types;
const { FILES_UPLOAD_LIMIT, MAX_FILE_SIZE } = require('../../constants').database
const { fileStorage, getGFS } = require('../model');
const {handleError} = require("../../helpers");
const gfsError = {status: 404, message: 'could not connect to file storage'}
/**
 * @class controllers.files
 */

/**
 * @description Only works if the request body is a FormData. Uploads all found binary files
 * inside the request FormData; Replaces the `req.body` with an object
 * that contains all original FormData fields and `req.body.files` - an array
 * with metadata about all uploaded files.
 * See {@link https://www.npmjs.com/package/multer multer} for details
 * @throws 400
 * @memberOf controllers.files
 */
const uploadFiles = multer({
    storage: fileStorage,
    limits: { files: FILES_UPLOAD_LIMIT, fileSize: MAX_FILE_SIZE}
}).any()
exports.uploadFiles = uploadFiles;

// gfs.remove(...) to delete file
// gfs.files.findOne/find/update/.../
// to perform any other operations to the Uploads mongo collection
// see GridFS docs for details

/**
 * @type function
 * @description Sends metadata about newly uploaded files via
 * the {@link controllers.files.uploadFiles uploadFiles controller}
 * @memberOf controllers.files
 */
const sendNewlyUploadedFiles = (req, res) => {
    return res.json({ files: req.files})
}
exports.sendNewlyUploadedFiles = sendNewlyUploadedFiles;

/**
 * @type function
 * @throws 404
 * @description Sends metadata about newly uploaded files via
 * the {@link controllers.files.uploadFiles uploadFiles controller}
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {function} next
 * @param {string} id - the id of the file
 * @memberOf controllers.files
 */
const fileById = (req, res, next, id) => {
    let fileId;
    try {
        fileId = ObjectId(id);
    } catch (err) { return handleError(err, res) }
    const gfs = getGFS();
    if (!gfs) {
        return handleError(gfsError, res);
    }
    return gfs.files.findOne({_id: fileId})
        .then(file => {
            if (!file || file.length === 0) throw {
                status: 404, message: 'no such file exists'
            }
            req.file = file;
            return next();
        })
        .catch(err => {handleError(err, res)})
}
exports.fileById = fileById;

/**
 * @type function
 * @throws 401
 * @description lets subsequent middleware get invoked
 * only if the authenticated user has uploaded the
 * given file under `req.file` via the
 * {@link controllers.files.fileById fileById controller}.
 * the {@link controllers.files.uploadFiles uploadFiles controller}
 * @param {e.Request} req
 * @param {models.User} req.auth
 * @param {models.GridFSFile} req.file
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.files
 */
const allowModifyFile = (req, res, next) => {
    let { uploadedBy } = req.file.metadata;
    if (uploadedBy && !req.auth._id.equals(uploadedBy)){
        return res.status(401).json({
            error: 'you are not authorized to modify this file'
        })
    }
    return next();
}
exports.allowModifyFile = allowModifyFile;

/**
 * @type function
 * @description sets a custom file name for the file that is
 * going to be streamed / sent for download
 * @param {e.Request} req
 * @param {models.GridFSFile} req.file
 * @param {string} req.fileName
 * @param {string} fileName
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.files
 */
const setFileName = (req, res, next, fileName) => {
    req.fileName = fileName;
    return next();
}
exports.setFileName = setFileName;

/**
 * @type function
 * @description configures the headers in such a way
 * that the wanted file under `req.file` is going to be streamed
 * in the client's browser. {@link controllers.files.streamFile streamFile}
 * should be the last controller in the chain after this one
 * @param {e.Request} req
 * @param {models.GridFSFile} req.file
 * @param {string} req.fileName
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.files
 */
const configStream = (req, res, next) => {
    let fileName = req.file.metadata.originalName || req.fileName;
    res.set({
        'Content-Type': req.file.contentType,
        'Content-Disposition': `inline; filename=${fileName || 'unknown_name'}`
    })
    return next();
}
exports.configStream = configStream;

/**
 * @type function
 * @description configures the headers in such a way
 * that the wanted file under `req.file` is going to be downloaded on
 * the client's machine. {@link controllers.files.streamFile streamFile}
 * should be the last controller in the chain after this one
 * @param {e.Request} req
 * @param {models.GridFSFile} req.file
 * @param {string} req.fileName
 * @param {e.Response} res
 * @param {function} next
 * @memberOf controllers.files
 */
const configDownload = (req, res, next) => {
    let fileName = req.file.metadata.originalName || req.fileName;
    res.set({
        'Content-Length': req.file.length,
        'Content-Type': `application/octet-stream filename=${fileName || 'unknown_name'}`
    })
    return next();
}
exports.configDownload = configDownload;

/**
 * @type function
 * @description configures the headers in such a way
 * that the wanted file under `req.file` is going to be downloaded on
 * the client's machine. {@link controllers.files.streamFile streamFile}
 * should be the last controller in the chain after this one
 * @param {e.Request} req
 * @param {models.GridFSFile} req.file
 * @param {string} req.fileName
 * @param {e.Response} res
 * @memberOf controllers.files
 */
const streamFile = (req, res) => {
    const gfs = getGFS();
    if (!gfs) {
        return handleError(gfsError, res);
    }
    let readStream = gfs.createReadStream(req.file.filename);
    readStream.pipe(res);
}
exports.streamFile = streamFile;

/**
 * @type function
 * @description deletes a single file,
 * found by the id from the url param
 * (by the {@link controllers.files.fileById fileById controller})
 * @param {e.Request} req
 * @param {models.GridFSFile} req.file
 * @param {string} req.fileName
 * @param {e.Response} res
 * @memberOf controllers.files
 */
const deleteFile = (req, res) => {
    const gfs = getGFS();
    if (!gfs) {
        return handleError(gfsError, res);
    }
    return gfs.remove({_id: req.file._id, root: 'uploads'}, (err) => {
        if (err){
            return handleError(err, res);
        } else {
            return res.json({ message: 'file deleted successfully'});
        }
    })
}
exports.deleteFile = deleteFile;

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
const deleteFiles = (req, res, next) => {
    if (!req.filesToDelete || req.filesToDelete.length === 0){
        return next();
    }
    const gfs = getGFS();
    if (!gfs) {
        return handleError(gfsError, res);
    }
    return Promise.all(req.filesToDelete.map(id => new Promise((resolve, reject ) => {
        gfs.remove({_id: id, root: 'uploads'}, (err) => (
            err ? reject(err) : resolve(id)
        ))
    })))
        .then(() => next())
        .catch(err => {handleError(err, res)})
}
exports.deleteFiles = deleteFiles;

// -----------------------------------------------------------------------
// this lower part is still not finished or not implemented.
// The endpoints there don't work
//

//TODO implement this controller
exports.getFilesFiltered = (req, res) => {
    let filter = {}
    if (req.body.fileId){
        filter._id = mongoose.mongo.ObjectId(req.body.fileId);
    }
    const gfs = getGFS();
    if (!gfs) {
        return handleError(gfsError, res);
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
        res.json(files);
    })
}