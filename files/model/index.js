let GridFS = require('gridfs-stream');
let GridFSStorage = require('multer-gridfs-storage');
let mongoose = require('mongoose');
let crypto = require('crypto');
let constants = require('../../constants');

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       description: >
 *         Files are stored here in MongoDB via GridFS. There are 2 collections:
 *         one for file metadata and the other one for actual file chunks
 *         of up to 255kb.
 *         See [GridFS docs](https://docs.mongodb.com/manual/core/gridfs/) for details
 */
/**
 * @typedef GridFSFile
 * @description a GridFS file is stored inside
 * two collection: one for metadata and the other
 * one for actual binary data chunks of up to 255kb.
 * See {@link https://docs.mongodb.com/manual/core/gridfs/ GridFS docs}
 * for more details
 * @memberOf models
 * @name GridFSFile
 * @type Object|File
 */
let gfs;
mongoose.connection.on('open', () => {
    gfs = GridFS(mongoose.connection.db, mongoose.mongo);
    gfs.collection('uploads');
    gfs.find = gfs.files.find;
})

/**
 * @description if this returns `undefined` then
 * the connection to the GridFS storage hasn't yet been established.
 * After successful connection to MongoDB and therefore GridFS storage,
 * this function will return the object which
 * is like a MongoDB model, but manipulates files.
 * See {@link https://www.npmjs.com/package/gridfs-stream gridfs-stream}
 * for details
 * @return {?g.Grid }
 */
const getGFS = () => gfs;
exports.getGFS = getGFS;

const fileStorage = new GridFSStorage({
    url: constants.database.MONGODB_URI,
    file: (req, file) => (new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
            if (err) {
                return reject(err);
            }
            // filename should be unique, decided to use
            // crypto here instead of uuid
            let filename = buf.toString('hex');
            let fileInfo = {
                filename: filename,
                bucketName: 'uploads',
                metadata: {
                    uploadedBy: req.auth._id,
                    originalName: file.originalname
                }
            }
            resolve(fileInfo);
        })})
    )
})
exports.fileStorage = fileStorage;