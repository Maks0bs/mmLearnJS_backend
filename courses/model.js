let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
let uuidv1 = require('uuid/v1');
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
					content: String, //to change to smth more global
					answers: [
						{
							type: ObjectId
						}//!!!!!!!!!!populate this shit when sending response!!!!!!
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
	content: entryContentSchema,
	description: {
		text: String,
		additionalContent: entryContentSchema
	}
}, {
	discriminatorKey: 'kind'
})
entrySchema.path('content').discriminator('EntryFile', entryFileSchema)
entrySchema.path('content').discriminator('EntryText', entryTextSchema)
entrySchema.path('content').discriminator('EntryForum', entryForumSchema)
entrySchema.path('description.additionalContent').discriminator('EntryFile', entryFileSchema)
entrySchema.path('description.additionalContent').discriminator('EntryText', entryTextSchema)
entrySchema.path('description.additionalContent').discriminator('EntryForum', entryForumSchema)
let Entry = mongoose.model('Entry', entrySchema);
exports.Entry = Entry;

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
	about: String,
	type: {
		type: String, //can be public, open for students to search and view basic info, hidden
		require: true
	},
	hasPassword: {
		type: Boolean,
		default: false
	},
	hashed_password: String,
	actions: [
		{
			type: Object
		}
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

