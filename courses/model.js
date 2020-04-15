let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
let uuidv1 = require('uuid/v1');
let crypto = require('crypto');

/*let courseEntrySchema = new mongoose.Schema({

})

let CourseEntry = mongoose.model('CourseEntry', courseEntrySchema);

let courseSectionSchema = new mongoose.Schema({
	name: String,
	description: String,
	entries: [
		{
			type: ObjectId,
			ref: ''
		}
	]
})

let CourseSection = mongoose.model('CourseSection', course)*/

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
				{
					type: {
						type: String,
						required: true
					},
					name: {
						type: String,
						required: true
					},
					content: {},
					description: {
						type: {
							type: String//,
							//required: true
						},
						content: {}
					}
				}
			]
		}
	]
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

module.exports = mongoose.model('Course', courseSchema);

