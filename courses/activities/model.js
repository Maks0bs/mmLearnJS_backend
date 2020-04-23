let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;


let options = {
	discriminatorKey: 'kind'
}
let activitiesSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	type: {
		type: String,
		required: true
	},
	createdBy: {
		type: ObjectId,
		ref: 'User'
	},
	created: {
		type: Date,
		default: Date.now
	},
	updated: Date,
	
}, options);

let Activity = mongoose.model('Activity', activitiesSchema);
exports.Activity = Activity;

exports.Forum = Activity.discriminator('Forum', new mongoose.Schema({
	initiator: {
		type: ObjectId,
		ref: 'User'
	},
	archived: Boolean,
	closed: Boolean,
	posts: [
		{
			title: {
				type: String
			},
			content: {
				type: String
			}
		}
	]
}, options))

exports.Test = Activity.discriminator('Test', new mongoose.Schema({
	name: String,
	completed: Boolean
}, options))