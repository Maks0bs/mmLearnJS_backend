let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
let { v1: uuidv1} = require('uuid');
let crypto = require('crypto');
//let Int32 = require('mongoose-int32');

let entryContentSchema = new mongoose.Schema({
	info: {}
}, {
	discriminatorKey: 'kind'
})
let EntryContent = mongoose.model('EntryContent', entryContentSchema);
exports.EntryContent = EntryContent;

let entryTextSchema = new mongoose.Schema({
	text: String
}, {
	discriminatorKey: 'kind'
})
let EntryText = EntryContent.discriminator('EntryText', entryTextSchema);
exports.EntryText = EntryText;

let forumTopicPostSchema = new mongoose.Schema({
	creator: {
		type: ObjectId,
		ref: 'User'
	},
	created: {
		type: Date,
		default: Date.now
	},
	updated: Date,
	content: String, //to change to smth more global
	answers: [
		{
			type: ObjectId
		}//!!!!!!!!!!populate this shit when sending response!!!!!!
	]
})

let ForumTopicPost = mongoose.model('ForumTopicPost', forumTopicPostSchema);
exports.ForumTopicPost = ForumTopicPost;

let entryForumSchema = new mongoose.Schema({
	description: String,
	teachersOnly: Boolean,
	topics: [
		{
			name: String,
			creator: {
				type: ObjectId,
				ref: 'User'
			},
			created: {
				type: Date,
				default: Date.now
			},
			updated: Date,
			posts: [
				{
					creator: {
						type: ObjectId,
						ref: 'User'
					},
					created: {
						type: Date,
						default: Date.now
					},
					updated: Date,
					content: String, //TODO change to smth more global
					answers: [
						{
							type: ObjectId
						}
					]
				}
			]
		}
	]
}, {
	discriminatorKey: 'kind'
})
let EntryForum = EntryContent.discriminator('EntryForum', entryForumSchema);
exports.EntryForum = EntryForum;

let entryFileSchema = new mongoose.Schema({
	fieldname: String,
	originalname: {
		type: String,
		required: true
	},
	encoding: String,
	mimetype: String,
	id: {
		type: ObjectId,
		ref: 'Uploads.File',
		required: true
	},
	filename: {
		type: String,
		required: true
	},
	metadata: {},
	bucketName: {
		type: String,
		required: true
	},
	chunkSize: Number,
	size: Number,
	md5: String,
	uploadDate: Date,
	contentType: {
		type: String,
		required: true
	}
}, {
	discriminatorKey: 'kind'
})
let EntryFile = EntryContent.discriminator('EntryFile', entryFileSchema);
exports.EntryFile = EntryFile;

let entrySchema = new mongoose.Schema({
	type: {
		type: String,
		required: true
	},
	name: {
		type: String,
		required: true
	},
	access: {
		type: String,
		required: true
	},
	content: entryContentSchema
}, {
	discriminatorKey: 'kind'
})
entrySchema.path('content').discriminator('EntryFile', entryFileSchema)
entrySchema.path('content').discriminator('EntryText', entryTextSchema)
entrySchema.path('content').discriminator('EntryForum', entryForumSchema)
let Entry = mongoose.model('Entry', entrySchema);
exports.Entry = Entry;

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

/**
 * Here we don't use refs to EntrySchema, because they can get deleted an this might cause trouble
 * @param newEntries.name name of the added entry,
 * @param newEntries.type type of the added entry
 */
let updateNewEntriesSchema = new mongoose.Schema({
	newEntries: [
		{
			name: String,
			type: {
				type: String
			}
		}

	]
})
let UpdateNewEntries = CourseUpdate.discriminator('UpdateNewEntries', updateNewEntriesSchema);
exports.UpdateNewEntries = UpdateNewEntries;

/**
 * Here we don't use refs to EntrySchema, because entries are not stored separately from the course
 * @param newEntries.name name of the deleted entry,
 * @param newEntries.type type of the deleted entry
 */
let updateDeletedEntriesSchema = new mongoose.Schema({
	deletedEntries: [
		{
			name: String,
			type: {
				type: String
			}
		}

	]
})
let UpdateDeletedEntries = CourseUpdate.discriminator('UpdateDeletedEntries', updateDeletedEntriesSchema);
exports.UpdateDeletedEntries = UpdateDeletedEntries;

/**
 * @param newName new name of the updated course
 * @param newAbout new info about the updated course
 */
let updateNewInfoSchema = new mongoose.Schema({
	oldName: String,
	newName: String,
	newAbout: String
})
let UpdateNewInfo = CourseUpdate.discriminator('UpdateNewInfo', updateNewInfoSchema);
exports.UpdateNewInfo = UpdateNewInfo;

let courseSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		required: true
	},
	creator: {
		type: ObjectId,
		ref: 'User'
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
		require: true,
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
		console.log('course salt',this.salt, 'uuid', uuidv1());
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
			console.log('test salt ', this, 'password ', password);
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

