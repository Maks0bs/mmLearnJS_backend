let GridFS = require('gridfs-stream');
let GridFSStorage = require('multer-gridfs-storage');
let multer = require('multer');
let mongoose = require('mongoose');
let crypto = require('crypto');
let {
	uploadFiles,
	sendFiles,
	getFilesFiltered,
	streamFile,
	setFilename,
	fileById,
	configDownload,
	configStream,
	deleteFile,
	allowModifyFile,
	deleteFiles
} = require('./controller');
let {
	isCourseTeacher,
	requireAuthentication,
} = require('../users/controllers')
let router = require('express').Router()

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: >
 *     API endpoints for handling files. They are saved in MongoDB via GridFS
 *   externalDocs:
 *     url: "https://docs.mongodb.com/manual/core/gridfs/"
 *     description: Find out more about GridFS
 */

router.post('/upload', 
	requireAuthentication,
	uploadFiles, 
	sendFiles
);

router.get('/download/:fileId/:filename?', configDownload, streamFile);
router.get('/stream/:fileId/:filename?', configStream, streamFile);
router.delete('/:fileId', 
	requireAuthentication, 
	allowModifyFile, 
	deleteFile
);

router.param('fileId', fileById);
router.param('filename', setFilename)

module.exports = router;