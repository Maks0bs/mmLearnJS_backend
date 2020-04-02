let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
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
	students: [
		{
			type: ObjectId,
			ref: 'User'
		}
	],
	about: String,
	courseType: {
		type: String, //can be public, open for students to search and view basic info, hidden
		require: true
	}
})

module.exports = mongoose.model('Course', courseSchema);
