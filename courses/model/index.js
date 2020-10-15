let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
let { v1: uuidv1} = require('uuid');
let crypto = require('crypto');

// ------------------ Task
//TODO this should be the easiest part. Just improve already existing validators
// tasks should be saved directly to the DB
/*
 See ./Exercise
 */

// ------------------ Exercise
//TODO exercises should be referenced as schemas in the course document, !not the model!
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
 * @typedef Course
 * @memberOf models
 * @name Course
 * @type Object
 * @property {ObjectId} _id
 * @property {string} name
 * @property {models.User}
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
 */
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
				entrySchema
			]
		}
	],
	exercises: [
		courseExerciseSchema
	]
}, {
	discriminatorKey: 'kind'
})
courseSchema.path('updates').discriminator('UpdateNewEntries', updateNewEntriesSchema)
courseSchema.path('updates').discriminator('UpdateDeletedEntries', updateDeletedEntriesSchema)
courseSchema.path('updates').discriminator('UpdateNewInfo', updateNewInfoSchema)

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

courseSchema.methods = {
	checkPassword: function(plainText){
		return this.encryptPassword(plainText) === this.hashed_password
	},

	encryptPassword: function(password){
		if (!password) return '';
		try {
			return crypto.createHmac('sha1', this.salt)
			.update(password)
			.digest('hex');
		} catch(err){
			console.log(err);
			return '';
		}
	}
}
let Course = mongoose.model('Course', courseSchema);
exports.Course = Course;