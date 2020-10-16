let mongoose = require('mongoose');

/**
 * @class CourseUpdate
 * @memberOf models.Course
 * @name CourseUpdate
 * @property {ObjectId} _id
 * @property {BSONDate} created
 */
/**
 * @class CourseUpdateNewEntries
 * @augments models.Course.CourseUpdate
 * @memberOf models.Course
 * @name CourseUpdateNewEntries
 * @property {{name: string, type: string}[]} newEntries
 */
/**
 * @class CourseUpdateDeletedEntries
 * @augments models.Course.CourseUpdate
 * @memberOf models.Course
 * @name CourseUpdateDeletedEntries
 * @property {{name: string, type: string}[]} deletedEntries
 */
/**
 * @class CourseUpdateNewInfo
 * @augments models.Course.CourseUpdate
 * @memberOf models.Course
 * @name CourseUpdateNewEntries
 * @property {string} oldName
 * @property {string} newName
 * @property {?string} newAbout
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     ExerciseTask:
 *       allOf:
 *         - type: object
 *           required:
 *             - _id
 *             - created
 *           properties:
 *             _id:
 *               $ref: '#/components/schemas/ObjectId'
 *             created:
 *               $ref: '#/components/schemas/Date'
 *         - oneOf:
 *           - type: object
 *             properties:
 *               newEntries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *           - type: object
 *             properties:
 *               deletedEntries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *           - type: object
 *             properties:
 *               newName:
 *                 type: string
 *               oldName:
 *                 type: string
 *               newAbout:
 *                 type: string
 *///TODO don't forget to check if docs are compiled correctly
let courseUpdateSchema = new mongoose.Schema({
    created: {
        type: Date,
        default: Date.now
    }
}, {
    discriminatorKey: 'kind'
})
let CourseUpdate = mongoose.model('CourseUpdate', courseUpdateSchema);
exports.CourseUpdate = CourseUpdate;
exports.courseUpdateSchema = courseUpdateSchema;

let updateNewEntriesSchema = new mongoose.Schema({
    newEntries: [
        {
            name: String,
            type: { type: String }
        }
    ]
})
let UpdateNewEntries = CourseUpdate.discriminator(
    'UpdateNewEntries', updateNewEntriesSchema
);
exports.UpdateNewEntries = UpdateNewEntries;
exports.updateNewEntriesSchema = updateNewEntriesSchema;

let updateDeletedEntriesSchema = new mongoose.Schema({
    deletedEntries: [
        {
            name: String,
            type: { type: String }
        }
    ]
})
let UpdateDeletedEntries = CourseUpdate.discriminator(
    'UpdateDeletedEntries', updateDeletedEntriesSchema
);
exports.UpdateDeletedEntries = UpdateDeletedEntries;
exports.updateDeletedEntriesSchema = updateDeletedEntriesSchema;

let updateNewInfoSchema = new mongoose.Schema({
    oldName: String,
    newName: String,
    newAbout: String
})
let UpdateNewInfo = CourseUpdate.discriminator('UpdateNewInfo', updateNewInfoSchema);
exports.UpdateNewInfo = UpdateNewInfo;
exports.updateNewInfoSchema = updateNewInfoSchema;