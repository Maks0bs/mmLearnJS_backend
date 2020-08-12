let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
let { v1: uuidv1} = require('uuid');
let crypto = require('crypto');

let attemptAnswerSchema = new mongoose.Schema({
	taskRef: {
		type: ObjectId,
		required: true
	},
	score: {
		type: Number,
		default: null
	}
}, {
	discriminatorKey: 'kind'
})

let AttemptAnswer = mongoose.model('AttemptAnswer', attemptAnswerSchema);
exports.AttemptAnswer = AttemptAnswer;

let oneAttemptAnswerSchema = new mongoose.Schema({
	value: String
})

let OneAttemptAnswer = AttemptAnswer.discriminator('OneAttemptAnswer', oneAttemptAnswerSchema);
exports.OneAttemptAnswer = OneAttemptAnswer;

let multipleAttemptAnswerSchema = new mongoose.Schema({
	values: [
		String
	]
})

let MultipleAttemptAnswer = AttemptAnswer.discriminator('MultipleAttemptAnswer', multipleAttemptAnswerSchema);
exports.MultipleAttemptAnswer = MultipleAttemptAnswer;


let exerciseAttemptSchema = new mongoose.Schema({
	startTime: {
		type: Date,
		default: Date.now
		//TODO maybe make required
	},
	endTime: {
		type: Date,
		default: null
		//TODO maybe make required
	},
	answers: [
		attemptAnswerSchema
	],
	score: {
		type: Number,
		default: null
	}
}, {
	discriminatorKey: 'kind'
})

let ExerciseAttempt = mongoose.model('ExerciseAttempt', exerciseAttemptSchema);
exports.ExerciseAttempt = ExerciseAttempt;

exerciseAttemptSchema.path('answers').discriminator('OneAttemptAnswer', oneAttemptAnswerSchema)
exerciseAttemptSchema.path('answers').discriminator('MultipleAttemptAnswer', multipleAttemptAnswerSchema)

let exerciseTaskSchema = new mongoose.Schema({
	description: String,
	score: {
		type: Number,
		required: true
	}
}, {
	discriminatorKey: 'kind'
})

let ExerciseTask = mongoose.model('ExerciseTask', exerciseTaskSchema);
exports.ExerciseTask = ExerciseTask;

let courseExerciseSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	participants: [
		{
			user: {
				type: ObjectId,
				ref: 'User'
			},
			attempts: [
				exerciseAttemptSchema
			]
		}
	],
	tasks: [
		exerciseTaskSchema
	],
	available: {
		type: Boolean,
		required: true
	},
	weight: {//TODO if no weight gets received in the update request, set to 1. Add this to schema methods
		type: Number,
		required: true,
		default: 1
	}
}, {
	discriminatorKey: 'kind'
})

let Exercise = mongoose.model('CourseExercise', courseExerciseSchema);
exports.Exercise = Exercise;


function choiceArrayValidator(arr){
	return arr.length >= 1;
}
function oneChoiceCorrectAnsValidator(){
	//console.log('one choice', this);
	if (!this.correctAnswer){
		return false;
	}

	for (let i of this.options){
		if (i.key === this.correctAnswer){
			return true;
		}
	}

	return false;
}
let oneChoiceExerciseSchema = new mongoose.Schema({
	options: {
		_id: false,
		type: [
			{
				text: String,
				key: String
			}
		],
		validate: {
			validator: choiceArrayValidator,
			message: `There should be at least one option in every one-choice exercise`
		}
	},
	correctAnswer: {
		type: String,
		required: 'There should be a correct answer which is equal to one of the options in every one-choice exercise',
		validate: {
			validator: oneChoiceCorrectAnsValidator,
			message: 'There should be a correct answer which is equal to one of the options in every one-choice exercise'
		}
	}
})
let OneChoiceExercise = ExerciseTask.discriminator('OneChoiceExercise', oneChoiceExerciseSchema);
exports.OneChoiceExercise = OneChoiceExercise;

function multipleChoiceCorrectAnsValidator(){
	if (!this.correctAnswers){
		return false;
	}

	let optionsSet = {};

	for (let i of this.options){
		optionsSet[i.key] = 1;
	}

	for (let i of this.correctAnswers){
		if (!optionsSet[i]){
			return false;
		}
	}

	return true;
}
let multipleChoiceExerciseSchema = new mongoose.Schema({
	options: {
		_id: false,
		type: [
			{
				text: String,
				key: String
			}
		],
		validate: {
			validator: choiceArrayValidator,
			message: `There should be at least one option in every multiple-choice exercise`
		}
	},
	correctAnswers: {
		type: [
			{
				type: String
			}
		],
		validate: {
			validator: multipleChoiceCorrectAnsValidator,
			message: 'Correct answers in multiple choice tasks should be the keys of other options of the given task'
		}
	},
	onlyFull: Boolean // if true, score for this exercise gets counted if all options are selected correctly
})
let MultipleChoiceExercise = ExerciseTask.discriminator('MultipleChoiceExercise', multipleChoiceExerciseSchema);
exports.MultipleChoiceExercise = MultipleChoiceExercise;

let textExerciseSchema = new mongoose.Schema({
	correctAnswers: [
		{
			type: String //has to be one of the keys
		}
	],
	interpretMath: Boolean //TODO for future: interpret the answer as a math statement
})
let TextExercise = ExerciseTask.discriminator('TextExercise', textExerciseSchema);
exports.TextExercise = TextExercise;



courseExerciseSchema.path('tasks').discriminator('OneChoiceExercise', oneChoiceExerciseSchema)
courseExerciseSchema.path('tasks').discriminator('MultipleChoiceExercise', multipleChoiceExerciseSchema)
courseExerciseSchema.path('tasks').discriminator('TextExercise', textExerciseSchema)


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

