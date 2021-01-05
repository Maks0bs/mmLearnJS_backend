let { Entry } = require('../model/Entry')
let mongoose = require('mongoose')
let Forum = require('../../forums/model');
let Course = require('../model');
let Exercise = require('../../exercises/model');
let {ExerciseTask} = require('../../exercises/model/ExerciseTask')
let { extend } = require('lodash');
const { handleError, deleteFilesAsyncIndependent } = require("../../helpers");

const CONSTANTS = {
    UPDATABLE_FORUM_FIELDS: ['descriptions', 'name', 'teachersOnly', 'courseRefs'],
    DIRECTLY_MERGEABLE_COURSE_FIELDS: [
        'name', 'about', 'type', 'hasPassword', 'password',
    ]
}
exports.UPDATE_COURSE_CONSTANTS = CONSTANTS;

/**
 * @type function
 * @description Extracts new course data and files' metadata
 * from the received FormData which is used to update the course.
 * New course data is saved under `req.newCourse` and
 * the positions of entries that contain
 * newly uploaded files are saved under `req.filesPositions`.
 * This middleware instantiates the `req.promises` array
 * for efficient async operations and also starts a
 * {@link https://mongoosejs.com/docs/transactions.html MongoDB transaction}
 * for efficient updating of the course document.
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {Object} req.body
 * @param {models.Course} req.course
 * @param {string} req.body.newCourse
 * @param {string} req.body.filesPosition
 * @param {models.Course} req.newCourse
 * @param {Promise[]} req.promises
 * @param {Object} req.mongooseSession -
 * see {@link https://mongoosejs.com/docs/transactions.html mongoose transactions}
 * @param {{section: number, entry: number}[]} [req.filesPositions]
 * @param {function} next
 * @memberOf controllers.courses
 */
const initCourseEditing = (req, res, next) => {
    try {
        req.newCourse = JSON.parse(req.body.newCourse);
        req.filesPositions = req.body.filesPositions && JSON.parse(req.body.filesPositions);
        req.promises = [];
        mongoose.connection.startSession()
            .then(session => {
                req.mongooseSession = session;
                req.mongooseSession.startTransaction();
                // this course is guaranteed to be found!
                // because courseById has already been called
                return Course.findOne({_id: req.course._id})
                    .session(session || null)
                    .populate('exercises')
                    .populate('exercises.tasks')
                    .populate('sections.entries')
            })
            .then(/**@type models.Course|any*/ course => req.course = course)
            .then(() => next())
            .catch(err => {
                if (req.mongooseSession) req.mongooseSession.endSession();
                deleteFilesAsyncIndependent(req.files.map(f => f.id));
                handleError(err, res);
            })
    } catch (err) {
        if (req.mongooseSession) req.mongooseSession.endSession();
        deleteFilesAsyncIndependent(req.files.map(f => f.id));
        return handleError(err, res);
    }
}
exports.initCourseEditing = initCourseEditing;

/**
 * @type function
 * @description If the new course data implies
 * that some entries or exercises have been deleted
 * then this controller will remove all references
 * to those pieces of content that aren't used anymore.
 * This controller is responsible for passing
 * data about exercises/entries that should be
 * deleted to the correspondent cleanup-controllers.
 * See docs for these controllers
 * (e. g {@link controllers.exercises.deleteExercise deleteExercise})
 * for details. This controllers also specifies
 * what kind of news/updates are going to be added
 * to the course after successfully applying
 * changes to the course data
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {Object} req.body
 * @param {models.Course} req.course
 * @param {models.User} req.auth
 * @param {models.Course} req.newCourse
 * @param {Promise[]} req.promises
 * @param {models.Course.Entry[]} req.updatesNewEntries
 * @param {models.Course.Entry[]} req.updatesDeletedEntries
 * @param {models.Course.Entry[]} req.entriesToDelete
 * @param {models.Exercise[]} req.updatesNewExercises
 * @param {models.Exercise[]} req.updatesDeletedExercises
 * @param {models.Exercise[]} req.exercisesToDelete
 * @param {function} next
 * @memberOf controllers.courses
 */
const cleanupCourseData = (req, res, next) => {
    let { course, newCourse } = req,
        deleteOptions = { userId: req.auth._id, deleteFiles: true}
    const UNCHANGED = 'unchanged';
    let oldEntries = {}, newEntries = [], oldExercises = {}, newExercises = [];
    // find out which entries have been added and which ones have been removed
    if (Array.isArray(newCourse.sections)) {
        // mark all entries, that existed in the old course data
        course.sections.forEach(s => Array.isArray(s.entries) && s.entries.forEach(
            e => oldEntries[e._id.toString()] = e
        ))
        req.newCourse.sections.forEach(s => {
            if (Array.isArray(s.entries)) s.entries.forEach(e => {
                if (e._id){
                    oldEntries[e._id] = UNCHANGED;
                } else if (e.access !== 'teachers') {
                    // mark newly added entries to display them in the course news
                    newEntries.push({...e});
                }
            })
        })
    }
    req.updatesNewEntries = newEntries;

    let entriesToDelete = Object.values(oldEntries)
        .filter(e => e !== UNCHANGED);
    req.updatesDeletedEntries = entriesToDelete
        .filter(e => e.access !== 'teachers')
    entriesToDelete.forEach(e => req.promises.push(e.delete(deleteOptions)));

    // find out which exercises have been added and which ones have been removed
    if (Array.isArray(newCourse.exercises)) {
        // mark all exercises, that existed in the old course data
        course.exercises.forEach(e => oldExercises[e._id.toString()] = e)
        req.newCourse.exercises.forEach(/** @type models.Exercise */ e => {
            if (e._id){
                oldExercises[e._id] = UNCHANGED;
            } else if (e.available) {
                newExercises.push({...e});
            }
        })
    }
    req.updatesNewExercises = newExercises;

    let exercisesToDelete = Object.values(oldExercises)
        .filter(e => e !== UNCHANGED);
    req.updatesDeletedExercises = exercisesToDelete
        .filter(e => e.available)
    exercisesToDelete.forEach(e => {
        try{
            let courseRefIndex = e.courseRefs.findIndex(c => c.equals(course._id))
            if (courseRefIndex >= 0){
                e.courseRefs.splice(courseRefIndex)
                if (e.courseRefs.length === 0){
                    req.promises.push(e.delete(deleteOptions))
                } else {
                    req.promises.push(e.save())
                }
            }
        } catch (err) {
            console.log(err);
        }
    });
    return next();
}
exports.cleanupCourseData = cleanupCourseData;

/**
 * @type function
 * @throws 400
 * @description Adds news/updates to the course,
 * specified under `req.course`. It !! DOES NOT
 * SAVE !! the course to the db, the changes
 * are applied locally to the object, mentioned above
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {Object} req.body
 * @param {models.Course} req.course
 * @param {models.Course} req.newCourse
 * @param {models.Course.Entry[]} req.updatesNewEntries
 * @param {models.Course.Entry[]} req.updatesDeletedEntries
 * @param {models.Exercise[]} req.updatesNewExercises
 * @param {models.Exercise[]} req.updatesDeletedExercises
 * @param {function} next
 * @memberOf controllers.courses
 */
const addUpdatesToCourse = (req, res, next) => {
    let {
        updatesDeletedEntries: deletedEntries,
        updatesNewEntries: newEntries,
        updatesNewExercises: newExercises,
        updatesDeletedExercises: deletedExercises,
    } = req;
    let mapper = (e) => ({name: e.name, kind: e.kind})
    if (Array.isArray(deletedEntries) && (deletedEntries.length > 0)){
        req.course.updates.push({
            kind: 'UpdateDeletedEntries',
            deletedEntries: deletedEntries.map(mapper)
        })
    }
    if (Array.isArray(newEntries) && newEntries.length > 0){
        req.course.updates.push({
            kind: 'UpdateNewEntries',
            newEntries: newEntries.map(mapper)
        })
    }
    if (Array.isArray(deletedExercises) && deletedExercises.length > 0){
        req.course.updates.push({
            kind: 'UpdateDeletedExercises',
            deletedExercises: deletedExercises.map(mapper)
        })
    }
    if (Array.isArray(newExercises) && newExercises.length > 0){
        req.course.updates.push({
            kind: 'UpdateNewExercises',
            newExercises: newExercises.map(mapper)
        })
    }
    if ((req.newCourse.name && (req.newCourse.name !== req.course.name)) ||
        (req.newCourse.about && (req.newCourse.about !== req.course.about))
    ) {
        req.course.updates.push({
            kind: 'UpdateNewInfo',
            oldName: req.course.name,
            newName: req.newCourse.name,
            newAbout: req.newCourse.about
        })
    }
    //TODO if previously unavailable / hidden exercises or
    // entries GET published, also add updates for this

    return next();
}
exports.addUpdatesToCourse = addUpdatesToCourse;

/**
 * @type function
 * @throws 400
 * @description Updates the sections of the course,
 * specified under `req.course` with the new data,
 * provided in `req.newCourse.sections`.
 * It !! DOES NOT SAVE !! the course to the db, the changes
 * are applied locally to `req.course`.
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {Object} req.body
 * @param {models.Course} req.body.course
 * @param {models.Course} req.newCourse
 * @param {Promise[]} req.promises
 * @param {any} req.mongooseSession -
 * see {@link https://mongoosejs.com/docs/transactions.html mongoose transactions}
 * @param {function} next
 * @param {{section: number, entry: number}[]} [req.filesPositions]
 * @memberOf controllers.courses
 */
const updateCourseSections = (req, res, next) => {
    let {newCourse, course, filesPositions, files, mongooseSession: session} = req;
    let {sections: newSections} = newCourse;

    if (!Array.isArray(newSections)){
        return next();
    }
    if (Array.isArray(filesPositions)){
        if (filesPositions.length !== files.length){
            deleteFilesAsyncIndependent(req.files.map(f => f.id));
            return res.status(400).json({
                error: {
                    status: 400,
                    message: 'Error uploading files. You might have ' +
                        'forgotten to upload a file in a file-type entry'
                }
            })
        }
        // attach refs to newly uploaded files to the course entries
        filesPositions.forEach((f, i) => {
            let curEntry = newSections[f.section].entries[f.entry];
            if (files[i] && files[i].id){
                curEntry.file = files[i].id;
            } else {
                curEntry.file = null;
                curEntry.fileName = 'No file yet'
            }
            newSections[f.section].entries[f.entry] = curEntry;
        })
    }

    newSections.forEach((s, i) => s.entries.forEach((e, j) => {
        if (e.kind === 'EntryForum'){
            if (!e.forum._id){
                newSections[i].entries[j].forum = new Forum(
                    {...e.forum, courseRefs: [course._id], name: e.name}
                );
                req.promises.push(newSections[i].entries[j].forum.save({session: session}));
            } else {
                req.promises.push(new Promise((resolve, reject) => {
                    Forum.findById(e.forum._id)
                        .session(session || null)
                        .then(forum => {
                            let newData =
                                {...e.forum, name: e.name};
                            delete newData._id;
                            forum = extend(forum, newData);
                            return forum.save({session: session});
                        })
                        .then(forum => resolve(forum))
                        .catch(err => reject(err))
                }))
            }
        }
        if (!e._id) {
            newSections[i].entries[j] =
                new Entry({...e, courseRef: course._id});
            req.promises.push(newSections[i].entries[j].save({session: session}));
        } else {
            req.promises.push(new Promise((resolve, reject) => {
                Entry.findById(e._id)
                    .session(session || null)
                    .then(entry => {
                        entry = extend(entry, newSections[i].entries[j]);
                        return entry.save({session: session});
                    })
                    .then(entry => resolve(entry))
                    .catch(err => reject(err))
            }))
        }
    }))
    try {
        course = extend(course, {sections: newSections});
        req.course = course;
        return next();
    } catch (err) {
        deleteFilesAsyncIndependent(req.files.map(f => f.id));
        return handleError(err, res);
    }
}
exports.updateCourseSections = updateCourseSections;

/**
 * @type function
 * @throws 400
 * @description Updates the sections of the course,
 * specified under `req.course` with the new data,
 * provided in `req.newCourse.sections`.
 * It !! DOES NOT SAVE !! the course to the db, the changes
 * are applied locally to `req.course`.
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {Object} req.body
 * @param {models.Course} req.newCourse
 * @param {models.Course} req.course
 * @param {Promise[]} req.promises
 * @param {any} req.mongooseSession -
 * see {@link https://mongoosejs.com/docs/transactions.html mongoose transactions}
 * @param {function} next
 * @param {{section: number, entry: number}[]} [req.filesPositions]
 * @memberOf controllers.courses
 */
const updateCourseExercises = (req, res, next) => {
    //TODO disallow updating exercises, where there is a running attempt
    // maybe implement this via model.methods
    let {newCourse, course, mongooseSession: session} = req;
    let {exercises: newExercises} = newCourse;

    if (!Array.isArray(newExercises)){
        return next();
    }
    newExercises.forEach((e, i) => {
        let saveTasks = (i, tasks, id) => {
            if (Array.isArray(tasks)) tasks.forEach((t, j) => {
                if (!t._id){
                    tasks[j] = new ExerciseTask({...t, exerciseRefs: [id]});
                    req.promises.push(tasks[j].save({session: session}));
                } else {
                    req.promises.push(new Promise((resolve, reject) => {
                        return ExerciseTask.findById(t._id)
                            .session(session || null)
                            .then(task => {
                                task = extend(task, tasks[j]);
                                tasks[j] = task;
                                return task.save({session: session})
                            })
                            .then(ex => resolve(ex))
                            .catch(err => reject(err))
                    }))
                }
            })
            return tasks;
        }

        if (!e._id){
            let tasks = [...newCourse.exercises[i].tasks];
            // First save the exercise without tasks
            // and then add them via saveTasks.
            // This has to be done this way, because
            // all tasks require the reference to the exercise they are in.
            // if this were to be done the other way around,
            // the exercise would not have an Id at the
            // moment its tasks were getting saved, which would cause errors.
            newExercises[i].tasks = [];
            newExercises[i] =
                new Exercise({...e, courseRefs: [course._id]});
            newExercises[i].tasks = saveTasks(i, tasks, newExercises[i]._id);
            req.promises.push(
                newExercises[i].save({session: req.mongooseSession || null})
            );
        } else {
            newExercises[i].tasks =
                saveTasks(i, newExercises[i].tasks, newExercises[i]._id);
            req.promises.push(new Promise((resolve, reject) => {
                return Exercise.findById(e._id)
                    .session(req.mongooseSession || null)
                    .then(exercise => {
                        exercise = extend(exercise, newExercises[i]);
                        return exercise.save({session: session});
                    })
                    .then(ex => resolve(ex))
                    .catch(err => reject(err))
            }))
        }
    })
    try {
        course = extend(course, {exercises: newExercises});
        req.course = course;
        return next();
    } catch (err) {
        deleteFilesAsyncIndependent(req.files.map(f => f.id));
        return handleError(err, res);
    }
}
exports.updateCourseExercises = updateCourseExercises;

/**
 * @type function
 * @throws 400
 * @description Merges the `req.course` object
 * with all primitive field data in `req.newCourse`,
 * like the strings `name`, `about`, `type`.
 * To correctly update the course with more complex
 * data, user the appropriate controllers
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {Object} req.body
 * @param {models.Course} req.course
 * @param {function} next
 * @param {models.Course} req.newCourse
 * @memberOf controllers.courses
 */
const mergeCourseBasicFields = (req, res, next) => {
    let extender = {};
    for (let f of CONSTANTS.DIRECTLY_MERGEABLE_COURSE_FIELDS){
        if (req.newCourse[f]){
            extender[f] = req.newCourse[f]
        }
    }
    try {
        req.course = extend(req.course, extender);
        return next();
    } catch (err) {
        deleteFilesAsyncIndependent(req.files.map(f => f.id));
        return handleError(err, res);
    }
}
exports.mergeCourseBasicFields = mergeCourseBasicFields;

/**
 * @type function
 * @throws 400
 * @description Saves all changes applied
 * to the course under `req.course` and finishes
 * the middleware chain.
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {Object} req.body
 * @param {any} req.mongooseSession -
 * see {@link https://mongoosejs.com/docs/transactions.html mongoose transactions}
 * @param {models.Course} req.course
 * @param {Promise[]} req.promises
 * @memberOf controllers.courses
 */
const saveCourseChanges = (req, res) => {
    let {mongooseSession: session } = req;
    return Promise.all(Array.isArray(req.promises) ? req.promises : [])
        .then(() => req.course.save({session: session}))
        .then(result => {res.json(result)})
        .then(() => session && session.commitTransaction())
        .catch(err => {
            //session gets aborted automatically
            // when a MongoDB query promise gets rejected
            // session && session.abortTransaction()
            deleteFilesAsyncIndependent(req.files.map(f => f.id));
            handleError(err, res);
        })
        .finally(() => session && session.endSession())
}
exports.saveCourseChanges = saveCourseChanges;