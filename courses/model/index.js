let mongoose = require('mongoose');
const {
	updateNewEntriesSchema, updateDeletedEntriesSchema, updateNewInfoSchema
} = require("./CourseUpdate");
let { ObjectId } = mongoose.Schema;
let { v1: uuidv1} = require('uuid');
let { courseUpdateSchema } = require('./CourseUpdate');

/**
 * @class CourseSection
 * @memberOf models.Course
 * @name CourseSection
 * @type Object
 * @property {string} name
 * @property {?string} description
 * @property {models.Course.Entry[]} entries
 */
/**
 * @class Course
 * @memberOf models
 * @name Course
 * @type Object
 * @property {ObjectId} _id
 * @property {string} name
 * @property {?string} [about]
 * @property {string} [salt]
 * @property {string} [hashed_password]
 * @property {string} type
 * @property {boolean} hasPassword
 * @property {models.User|ObjectId} creator
 * @property {models.User[]|ObjectId[]} teachers
 * @property {models.User[]|ObjectId[]} students
 * @property {models.User[]|ObjectId[]} invitedTeachers
 * @property {models.User[]|ObjectId[]} subscribers
 * @property {models.Course.CourseUpdate[]} updates
 * @property {models.Course.Exercise[]} exercises
 * @property {models.Course.CourseSection[]} sections
 * @property {function(string): boolean} checkPassword see {@link models.Course.checkCredentials}
 * @property {function(string): string} encryptPassword see {@link models.Course.encryptPassword}
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       required:
 *         - _id
 *         - name
 *         - creator
 *       properties:
 *         _id:
 *           $ref: '#/components/schemas/ObjectId'
 *         name:
 *           type: string
 *         about:
 *           type: string
 *         salt:
 *           type: string
 *         hashed_password:
 *           type: string
 *         type:
 *           type: string
 *           enum: [open, public, hidden]
 *         hasPassword:
 *           type: boolean
 *         creator:
 *           oneOf:
 *             - $ref: '#/components/schemas/User'
 *             - $ref: '#/components/schemas/ObjectId'
 *         teachers:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/User'
 *               - $ref: '#/components/schemas/ObjectId'
 *         invitedTeachers:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/User'
 *               - $ref: '#/components/schemas/ObjectId'
 *         students:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/User'
 *               - $ref: '#/components/schemas/ObjectId'
 *         subscribers:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/User'
 *               - $ref: '#/components/schemas/ObjectId'
 *         updates:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/CourseUpdate'
 *               - $ref: '#/components/schemas/ObjectId'
 *         exercises:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/Exercise'
 *               - $ref: '#/components/schemas/ObjectId'
 *         sections:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               entries:
 *                 type: array
 *                 items:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/Entry'
 *                     - $ref: '#/components/schemas/ObjectId'
 */
let courseSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		required: 'Course name is required'
	},
	creator: {
		type: ObjectId,
		ref: 'User',
		required: 'Each course should have a creator'
	},
	teachers: [
		{
			type: ObjectId,
			ref: 'User'
		}
	],
	invitedTeachers: [
		{
			type: ObjectId,
			ref: 'User'
		}
	],
	salt: String,
	students: [
		{
			type: ObjectId,
			ref: 'User'
		}
	],
	subscribers: [
		{
			type: ObjectId,
			ref: 'User'
		}
	],
	about: String,
	type: {
		type: String,
		required: 'Course type is required',
		enum: ['open', 'public', 'hidden']
	},
	hasPassword: {
		type: Boolean,
		default: false
	},
	hashed_password: String,
	updates: [
		courseUpdateSchema
	],
	sections: [
		{
			name: {
				type: String,
				required: 'Each section should have a name'
			},
			description: String,
			entries: [
				//entrySchema
				{
					type: ObjectId,
					ref: 'Entry'
				}
			]
		}
	],
	exercises: [
		{
			type: ObjectId,
			ref: 'Exercise'
		}
	]
}, {
	discriminatorKey: 'kind'
})
courseSchema.path('updates').discriminator(
	'UpdateNewEntries', updateNewEntriesSchema
)
courseSchema.path('updates').discriminator(
	'UpdateDeletedEntries', updateDeletedEntriesSchema
)
courseSchema.path('updates').discriminator(
	'UpdateNewInfo', updateNewInfoSchema
)

courseSchema
	.virtual('password')
	.set(function(password){
		this._password = password;
		this.salt = uuidv1();
		this.hashed_password = this.encryptPassword(password);
	})
	.get(function() {
		return this._password;
	})
courseSchema.methods = require('./methods').courseMethods;
let Course = mongoose.model('Course', courseSchema);
module.exports = Course;