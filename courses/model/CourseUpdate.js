let mongoose = require('mongoose');

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
exports.courseUpdateSchema = courseUpdateSchema;

let updateNewEntriesSchema = new mongoose.Schema({
    newEntries: [
        {
            name: String,
            type: { type: String }
        }
    ]
})
let UpdateNewEntries = CourseUpdate.discriminator('UpdateNewEntries', updateNewEntriesSchema);
exports.UpdateNewEntries = UpdateNewEntries;
exports.updateNewEntriesSchema = updateNewEntriesSchema;

let updateDeletedEntriesSchema = new mongoose.Schema({
    deletedEntries: [
        {
            name: String,
            type: { type: String }
        }
    ]
})
let UpdateDeletedEntries =
    CourseUpdate.discriminator('UpdateDeletedEntries', updateDeletedEntriesSchema);
exports.UpdateDeletedEntries = UpdateDeletedEntries;
exports.updateDeletedEntriesSchema = updateDeletedEntriesSchema;

let updateNewInfoSchema = new mongoose.Schema({
    oldName: String,
    newName: String,
    newAbout: String
})
let UpdateNewInfo = CourseUpdate.discriminator('UpdateNewInfo', updateNewInfoSchema);
exports.UpdateNewInfo = UpdateNewInfo;
exports.updateNewInfoSchema = updateNewInfoSchema;