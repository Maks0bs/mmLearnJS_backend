let crypto = require('crypto');
let { getGFS } = require('../../files/model')

const USER_STATS = {
    NOT_ENROLLED: 'not enrolled',
    TEACHER: 'teacher',
    CREATOR: 'creator',
    INVITED_TEACHER: 'invited teacher',
    STUDENT: 'student'
}
const CONSTANTS = {
    USER_COURSE_STATUSES: USER_STATS
}
exports.COURSE_DATA_CONSTANTS = CONSTANTS;

exports.courseMethods = {
    /**
     * @function checkPassword
     * @description returns true if the given password in plain text is the correct one
     * for the given course and course has a password (this password was originally hashed and saved)
     * @param {string} plain
     * @return {boolean}
     *
     * @memberOf models.Course
     */
    checkPassword: function(plain){
        return this.hasPassword &&
            (this.encryptPassword(plain) === this.hashed_password)
    },
    /**
     * @description returns a hashed password, see {@link crypto}. The key for hashing the salt,
     * which is saved in the course document.
     * @param {string} password
     * @return {string}
     * @memberOf models.Course
     */
    encryptPassword: function(password){
        // we return "" because errors are caught inside this func.
        // if we try to set the wrongly encrypted password, it would cause a mongoose error
        if ((typeof password !== 'string') || !password) return "";
        try {
            return crypto.createHmac('sha1', this.salt)
                .update(password)
                .digest('hex');
        } catch(err){
            console.log(err);
            return '';
        }
    },
    /**
     * @description Cleans up some course data so that
     * all the data that is left can be displayed to
     * unauthenticated users that don't have any special access to course
     * @return undefined
     * @memberOf models.Course
     */
    leavePublicData: function(){
        delete this.sections;
        delete this.actions;
        delete this.students;
        delete this.invitedTeachers;
        delete this.creator;
        delete this.updates;
        delete this.exercises;
    },
    /**
     * @description Returns the status of the provided
     * user in relation to this course. The user
     * can be a teacher, creator, invited teacher, student
     * or not have any relation to the course
     * @param {string|ObjectId} userId
     * @return {string}
     * @memberOf models.Course
     */
    getUserCourseStatus: function(userId){
        if (Array.isArray(this.invitedTeachers)){
            for (let invited of this.invitedTeachers){
                if (invited.toString() === userId.toString()){
                    return USER_STATS.INVITED_TEACHER
                }
            }
        }
        for (let student of this.students){
            if (student.toString() === userId.toString()){
                return USER_STATS.STUDENT
            }
        }
        for (let teacher of this.teachers){
            if (teacher.toString() === userId.toString()){
                return USER_STATS.TEACHER
            }
        }
        if (this.creator && this.creator.toString() === userId.toString()){
            return USER_STATS.CREATOR
        }
        return USER_STATS.NOT_ENROLLED
    }
}

exports.entryMethods = {
    /**
     * @param {Object} options
     * @param {boolean} [options.deleteFiles] - set to true if
     * the files that are referenced in the entries should
     * also be removed from the DB
     * @param {string|ObjectId} options.userId - required option! The user
     * who performs the operation about deleting entries. Required
     * to check if this user has enough authorization
     * @return {Promise} - the promise that gets resolved
     * if all object that this entry references were
     * deleted successfully, it gets rejected if there
     * was a problem deleting some object. Please note
     * that this promise does not handle errors
     * automatically, they should be caught manually
     */
    delete: function (options) {
        const {Entry} = require('./Entry');
        const Forum = require('../../forums/model')
        let entryRef = this;
        return Entry.findById(this._id)
            .populate('courseRef', ['_id', 'name', 'teachers', 'students'])
            .then(entry => {
                let criteria = u => u.toString() === options.userId.toString();
                if (!entry.courseRef.teachers.find(criteria)){
                    throw {
                        message: 'The authenticated user is not authorized ' +
                            'to remove this entry'
                    }
                }
                switch (entry.kind){
                    case 'EntryForum':{
                        return Forum.findById(entry.forum)
                            .then(forum => {
                                let courseRefIndex = forum.courseRefs
                                    .findIndex(f => f.equals(entry.courseRef._id))
                                if (courseRefIndex >= 0){
                                    forum.courseRefs.splice(courseRefIndex, 1);
                                    if (forum.courseRefs.length === 0){
                                        return Forum.deleteOne({ _id: forum._id })
                                    } else {
                                        return forum.save();
                                    }
                                } else {
                                    return Promise.resolve(forum)
                                }
                            })
                    }
                    case 'EntryFile':{
                        let gfs = getGFS();
                        if (!gfs || !options.deleteFiles) return Promise.resolve(true);
                        return new Promise((resolve, reject) => {
                            gfs.remove({_id: entry.file, root: 'uploads'}, err => (
                                err ? reject(err) : resolve(entry.file)
                            ))
                        })
                    }
                    default: {
                        return Promise.resolve(true)
                    }
                }
            })
            .then(() => Entry.deleteOne({_id: entryRef._id}))
    }
}