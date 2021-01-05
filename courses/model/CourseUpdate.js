let mongoose = require('mongoose');

/**
 * @class CourseUpdate
 * @memberOf models.Course
 * @name CourseUpdate
 * @property {ObjectId} _id
 * @property {string} kind
 * @property {BSONDate} created
 */
/**
 * @class CourseUpdateNewEntries
 * @augments models.Course.CourseUpdate
 * @memberOf models.Course
 * @name CourseUpdateNewEntries
 * @property {{name: string, kind: string}[]} newEntries
 */
/**
 * @class CourseUpdateDeletedEntries
 * @augments models.Course.CourseUpdate
 * @memberOf models.Course
 * @name CourseUpdateDeletedEntries
 * @property {{name: string, kind: string}[]} deletedEntries
 */
/**
 * @class CourseUpdateNewExercises
 * @augments models.Course.CourseUpdate
 * @memberOf models.Course
 * @name CourseUpdateNewExercises
 * @property {{name: string}[]} newExercises
 */
/**
 * @class CourseUpdateDeletedExercises
 * @augments models.Course.CourseUpdate
 * @memberOf models.Course
 * @name CourseUpdateDeletedExercises
 * @property {{name: string}[]} deletedExercises
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
 *     CourseUpdate:
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
 *               newExercises:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *           - type: object
 *             properties:
 *               deletedExercises:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *           - type: object
 *             properties:
 *               newName:
 *                 type: string
 *               oldName:
 *                 type: string
 *               newAbout:
 *                 type: string
 */
let courseUpdateSchema = new mongoose.Schema({
    created: {
        type: Date,
        default: Date.now
    }
}, {
    discriminatorKey: 'kind',
    _id: false
})
let CourseUpdate = mongoose.model('CourseUpdate', courseUpdateSchema);
exports.CourseUpdate = CourseUpdate;
exports.courseUpdateSchema = courseUpdateSchema;

let updateNewEntriesSchema = new mongoose.Schema({
    newEntries: [
        {
            name: String,
            kind: String
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
            kind: String
        }
    ]
})
let UpdateDeletedEntries = CourseUpdate.discriminator(
    'UpdateDeletedEntries', updateDeletedEntriesSchema
);
exports.UpdateDeletedEntries = UpdateDeletedEntries;
exports.updateDeletedEntriesSchema = updateDeletedEntriesSchema;

let updateNewExercisesSchema = new mongoose.Schema({
    newExercises: [
        {
            name: String,
        }
    ]
})
let UpdateNewExercises = CourseUpdate.discriminator(
    'UpdateNewExercises', updateNewExercisesSchema
);
exports.UpdateNewExercises = UpdateNewExercises;
exports.updateNewExercisesSchema = updateNewExercisesSchema;

let updateDeletedExercisesSchema = new mongoose.Schema({
    deletedExercises: [
        {
            name: String
        }
    ]
})
let UpdateDeletedExercises = CourseUpdate.discriminator(
    'UpdateDeletedExercises', updateDeletedEntriesSchema
);
exports.UpdateDeletedExercises = UpdateDeletedExercises;
exports.updateDeletedExercisesSchema = updateDeletedExercisesSchema;

let updateNewInfoSchema = new mongoose.Schema({
    oldName: String,
    newName: String,
    newAbout: String
})
let UpdateNewInfo = CourseUpdate.discriminator('UpdateNewInfo', updateNewInfoSchema);
exports.UpdateNewInfo = UpdateNewInfo;
exports.updateNewInfoSchema = updateNewInfoSchema;