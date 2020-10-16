let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;

//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR
//TODO REFACTOR

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
    fileName: {
        type: String,
        required: true
    },
    file: {
        type: ObjectId,
        ref: 'Uploads.File'
    },
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