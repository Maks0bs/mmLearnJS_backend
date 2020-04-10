let GridFS = require('gridfs-stream');
let GridFSStorage = require('multer-gridfs-storage');
let multer = require('multer');
let mongoose = require('mongoose');
let crypto = require('crypto');
let {
	uploadFiles,
	sendFiles,
	getFileById
} = require('./controller');
let {
	isTeacher,
	requireAuthentication
} = require('../auth/controller')
let router = require('express').Router()
router.post('/upload', 
	requireAuthentication,
	uploadFiles, 
	sendFiles
);
router.get('/by-id', getFileById);

module.exports = router;