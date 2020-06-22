let mongoose = require('mongoose');
let { v1: uuidv1 } = require('uuid');
let crypto = require('crypto');
let { ObjectId } = mongoose.Schema;
let userSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		required: true
	},
	email: {
		type: String,
		trim: true,
		required: true
	},
	hashed_password: {
		type: String,
		required: true
	},
	salt: String, 
	created: {
		type: Date,
		default: Date.now
	},
	updated: Date,
	about: {
		type: String,
		trim: true
	},
	notifications: [
		{
			type: {
				type: String,
			},
			title: String,
			text: String,
			data: {},
			created: {
				type: Date,
				default: Date.now
			}
		}
	],
	role: {
		type: String,
		default: "student"
	},
	activated: {
		type: Boolean,
		default: false
	},
	enrolledCourses: [
		{
			type: ObjectId,
			ref: 'Course'
		}
	],
	teacherCourses: [
		{
			type: ObjectId,
			ref: 'Course'
		}
	],
	photo: {
		type: ObjectId,
		ref: 'Uploads.File'
	},
	hiddenFields: [
		{
			type: String
		}
	]
});

userSchema 
	.virtual('password')
	.set(function(password){
		// create temp variable called _password
		this._password = password;
		// generate a timestamp
		this.salt = uuidv1();
		// encrypt the pass
		this.hashed_password = this.encryptPassword(password);
	})
	.get(function() {
		return this._password;
	})

userSchema.methods = {
	checkCredentials : function(plainText){
		return this.encryptPassword(plainText) === this.hashed_password
	}, 

	encryptPassword: function(password){
		if (!password) return "";
		try {
			return crypto.createHmac('sha1', this.salt)
			.update(password)
			.digest('hex');
		} catch (err){
			return "";
		}

	}
}

module.exports = mongoose.model("User", userSchema);