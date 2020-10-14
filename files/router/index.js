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

/**
 * @swagger
 * path:
 *  /files/upload:
 *    post:
 *      summary: >
 *        Lets authenticated users upload files to the database.
 *        This is a direct upload and the files' metadata
 *        doesn't implicitly get saved anywhere else except for the uploads collection.
 *        If you want to reference the uploaded
 *        files afterwards, please use other endpoints to do that.
 *      operationId: uploadFile
 *      tags:
 *        - "/files/..."
 *      security:
 *        - cookieAuth: []
 *      requestBody:
 *        content:
 *          application/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                files:
 *                  type: array
 *                  items:
 *                    type: string
 *                    format: binary
 *
 *      responses:
 *        "200":
 *          description: >
 *            Successfully uploaded the provided files.
 *            Respond with metadata of each uploaded file
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                description: >
 *                  See GridFS docs for details on metadata values
 *                properties:
 *                  filename:
 *                    type: string
 *                  contentType:
 *                    type: string
 *                  metadata:
 *                    type: object
 *                    properties:
 *                      uploadedBy:
 *                        oneOf:
 *                          - $ref: '#/components/schemas/ObjectId'
 *                          - $ref: '#/components/schemas/User'
 *                      originalName:
 *                        type: string
 *        "400":
 *          description: >
 *            Invalid data in the files field.
 *            Files might be corrupted.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: User is not authenticated
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.post('/upload',
    requireAuthentication,
    uploadFiles,
    sendNewlyUploadedFiles
);

/**
 * @swagger
 * path:
 *  /files/download/:fileId/:filename?:
 *    get:
 *      summary: >
 *        sends the file with the given ID to the client
 *        in order for it to be downloaded.
 *      operationId: downloadFile
 *      tags:
 *        - "/files/..."
 *      parameters:
 *        - in: path
 *          name: fileId
 *          required: true
 *          schema:
 *            type: string
 *        - in: path
 *          name: filename
 *          description: optional custom filename for the wanted file
 *          schema:
 *            type: string
 *      responses:
 *        "200":
 *          description: >
 *            The binary data of the wanted file in chunks
 *          content:
 *            application/octet-stream:
 *              schema:
 *                type: string
 *                format: binary
 *        "404":
 *          description: File with given ID could not be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.get('/download/:fileId/:filename?', configDownload, streamFile);

/**
 * @swagger
 * path:
 *  /files/stream/:fileId/:filename?:
 *    get:
 *      summary: >
 *        sends the file with the given ID to the client
 *        in order for it to be streamed (primarily in the browser).
 *      operationId: downloadFile
 *      tags:
 *        - "/files/..."
 *      parameters:
 *        - in: path
 *          name: fileId
 *          required: true
 *          schema:
 *            type: string
 *        - in: path
 *          name: filename
 *          description: optional custom filename for the wanted file
 *          schema:
 *            type: string
 *      responses:
 *        "200":
 *          description: >
 *            The binary data of the wanted file in chunks
 *          content:
 *            application/octet-stream:
 *              schema:
 *                type: string
 *                format: binary
 *        "404":
 *          description: File with given ID could not be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.get('/stream/:fileId/:filename?', configStream, streamFile);

/**
 * @swagger
 * path:
 *  /files/:fileId:
 *    delete:
 *      summary: >
 *        Deletes the file with the given ID if the user
 *        was the original uploader of the file.
 *      operationId: deleteFile
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/files/..."
 *      parameters:
 *        - in: path
 *          name: fileId
 *          required: true
 *          schema:
 *            type: string
 *      responses:
 *        "200":
 *          description: File deleted successfully
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *        "400":
 *          description: >
 *            Error while deleting file.
 *            Chunks in the database might be corrupted.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: >
 *            User is not authenticated or the authenticated
 *            user is not the original uploader of the file
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "404":
 *          description: File with given ID could not be found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
router.delete('/:fileId',
    requireAuthentication,
    allowModifyFile,
    deleteFile
);

router.param('fileId', fileById);
router.param('filename', setFileName)

module.exports = router;