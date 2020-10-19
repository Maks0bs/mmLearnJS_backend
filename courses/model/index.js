let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
let { v1: uuidv1} = require('uuid');
let { courseUpdateSchema } = require('./CourseUpdate');

// ------------------ Task
//TODO this should be the easiest part. Just improve already existing validators
// tasks should be saved directly to the DB
/*
 See ./Task'
 added swagger docs
 added jsdoc
 refactored schema
 */

// ------------------ Exercise
//TODO exercises should be referenced as models in the course document,
// exercises themselves should contain refs to separate Tasks as ObjectIds!!!
// ????maybe also encapsulate exercise attempts????? (do it if the exercise schema gets too big)
/*
 See ./Exercise
 */

// ------------------ Entry
//TODO !get rid of entry.content!
// entries should be saved separately in the DB (and referenced as ObjectIds)
// also save forums independently as another document in MongoDB (forums
// should be referenced as ObjectIds from entries)
// entries need huge refactoring!!!!!

/*
 See ./Entry
 */

// ------------------ CourseUpdate
//TODO leave everything as is there, courseSchema should reference the courseUpdate!SCHEMA!,
// !not its model!
/*
  See ./CourseUpdate
*/




//TODO figure out what documents should be stored separately in the db (e. g. exercise tasks,
// but not exercises, as they are a part of the course directly)

//TODO first do a full refactor: replace existing built-in schemas with
// separate ones in other files. Only then fix all controllers to reflect these changes
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
 *///TODO don't forget to check if docs are compiled correctly
let courseSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		required: true
	},
	creator: {
		type: ObjectId,
		ref: 'User',
		required: true
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
		required: true,
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
				required: true
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
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// courseSchema.path('updates').discriminator('UpdateNewEntries', updateNewEntriesSchema)
// courseSchema.path('updates').discriminator('UpdateDeletedEntries', updateDeletedEntriesSchema)
// courseSchema.path('updates').discriminator('UpdateNewInfo', updateNewInfoSchema)

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