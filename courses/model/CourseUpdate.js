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
 * Here we don't use refs to EntrySchema, because they can GET deleted an this might cause trouble
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