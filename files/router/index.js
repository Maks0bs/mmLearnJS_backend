let {
    uploadFiles,
    sendNewlyUploadedFiles,
    streamFile,
    setFileName,
    fileById,
    configDownload,
    configStream,
    deleteFile,
    allowModifyFile,
} = require('../controllers');
let { requireAuthentication } = require('../../users/controllers')
let router = require('express').Router()

/**
 * @swagger
 * tags:
 *   name: /files/...
 *   description: >
 *     API endpoints for handling files. They are saved in MongoDB via GridFS
 *   externalDocs:
 *     url: "https://docs.mongodb.com/manual/core/gridfs/"
 *     description: Find out more about GridFS
 */

router.post('/upload',
    requireAuthentication,
    uploadFiles,
    sendNewlyUploadedFiles
);//TODO add docs and !!TESTS!! for this endpoint

//TODO add docs and !!TESTS!! for this endpoint
router.get('/download/:fileId/:filename?', configDownload, streamFile);
//TODO add docs and !!TESTS!! for this endpoint
router.get('/stream/:fileId/:filename?', configStream, streamFile);
router.delete('/:fileId',
    requireAuthentication,
    allowModifyFile,
    deleteFile
);//TODO add docs and !!TESTS!! for this endpoint

router.param('fileId', fileById);
router.param('filename', setFileName)

module.exports = router;