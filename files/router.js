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
} = require('../users/controllers/auth')
let router = require('express').Router()
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