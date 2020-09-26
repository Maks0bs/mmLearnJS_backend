let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
let newsEntriesSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true
	},
	body: {
		type: String,
		required: true
	},
	postedBy: {
		type: ObjectId,
		ref: "User"
	},
	created: {
		type: Date,
		default: Date.now
	},
	updated: Date,
	likes: [{type: ObjectId, ref: "User"}],
	comments: [
		{
			text: String,
			created: {type: Date, default: Date.now},
			postedBy: {type: ObjectId, ref: "User"}
		}
	]
});

module.exports = mongoose.model("NewsEntry", newsEntriesSchema);