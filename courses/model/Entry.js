let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;

/**
 * @class Entry
 * @memberOf models.Course
 * @name Entry
 * @property {ObjectId} _id
 * @property {string} name
 * @property {string} access
 */
/**
 * @class EntryText
 * @augments models.Course.Entry
 * @memberOf models.Course
 * @name EntryText
 * @property {?string} text
 */
/**
 * @class EntryFile
 * @augments models.Course.Entry
 * @memberOf models.Course
 * @name EntryFile
 * @property {string} [fileName]
 * @property {ObjectId|models.GridFSFile} file
 */
/**
 * @class EntryForum
 * @augments models.Course.Entry
 * @memberOf models.Course
 * @name EntryText
 * @property {ObjectId|models.Course.Forum} text
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Entry:
 *       allOf:
 *         - type: object
 *           required:
 *             - _id
 *             - name
 *             - access
 *           properties:
 *             _id:
 *               $ref: '#/components/schemas/ObjectId'
 *             name:
 *               type: string
 *             access:
 *               type: string
 *               enum: [teachers, students]
 *         - oneOf:
 *           - type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *           - type: object
 *             required:
 *               - forum
 *             properties:
 *               text:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/Forum'
 *                   - $ref: '#/components/schemas/ObjectId'
 *           - type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/File'
 *                   - $ref: '#/components/schemas/ObjectId'
 *               fileName:
 *                 type: string
 *///TODO don't forget to check if docs are compiled correctly
let entrySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    access: {
        type: String,
        required: true
    },
}, {
    discriminatorKey: 'kind'
})
let Entry = mongoose.model('Entry', entrySchema);
exports.Entry = Entry;
exports.entrySchema = entrySchema;

let entryTextSchema = new mongoose.Schema({
    text: String
})
let EntryText = Entry.discriminator('EntryText', entryTextSchema);
exports.EntryText = EntryText;
exports.entryTextSchema = entryTextSchema;

let entryForumSchema = new mongoose.Schema({
    forum: {
        type: ObjectId,
        ref: 'Forum'
    }
})
let EntryForum = Entry.discriminator('EntryText', entryForumSchema);
exports.EntryForum = EntryForum;
exports.entryForumSchema = entryForumSchema;

let entryFileSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    file: {
        type: ObjectId,
        ref: 'Uploads.File'
    },
})
let EntryFile = Entry.discriminator('EntryFile', entryFileSchema);
exports.EntryFile = EntryFile;
exports.entryFileSchema = entryFileSchema;

entrySchema.path('content').discriminator('EntryFile', entryFileSchema)
entrySchema.path('content').discriminator('EntryText', entryTextSchema)
entrySchema.path('content').discriminator('EntryForum', entryForumSchema)