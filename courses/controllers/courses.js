let mongoose = require('mongoose')
let Course = require('../model')
let { Entry } = require('../model/Entry')
let User = require('../../users/model');
let Forum = require('../../forums/model');
let Exercise = require('../../exercises/model');
let { extend, cloneDeep} = require('lodash');
const {formatMongooseError, handleError} = require("../../helpers");

const CONSTANTS = {
    UPDATABLE_FORUM_FIELDS: ['descriptions', 'name', 'teachersOnly', 'courseRefs']
}
exports.CONSTANTS = CONSTANTS;

/**
 * @class controllers.courses.courseData
 */
/**
 * @type function
 * @throws 400, 404
 * @description works with the `:courseId` param in the url. Adds all the data
 * about the course with the ID the provided parameter. Adds all course data to
 * the request object under the `req.course` property
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {function} next
 * @param {string} id - the id of the course that should be found
 * @memberOf controllers.courses.courseData
 */
const courseById = (req, res, next, id) => {
    return Course.findOne({_id: id})
        .populate('exercises')
        .populate('sections.entries')
        .then(course => {
            if (!course) throw {
                status: 404, error: 'course not found'
            }
            return course;
        })
        .then(course => {
            req.course = course;
            return next();
        })
        .catch(err => {handleError(err, res)})
}
exports.courseById = courseById;

/**
 * @type function
 * @throws 400
 * @description creates a new course with the given type and name.
 * If the `hasPassword` attribute is true, the course password should be
 * provided as well. See {@link models.Course course model} for details
 * @param {e.Request} req
 * @param {models.User} req.auth
 * @param {e.Response} res
 * @param {models.Course.Entry} req.course
 * @memberOf controllers.courses.courseData
 */
const createCourse = (req, res) => {
    let courseData = req.body;
    courseData.creator = req.auth;
    courseData.teachers = [req.auth];
    let course = new Course(courseData);
    return User.findByIdAndUpdate(
        req.auth._id,
        { $push: { teacherCourses: course } },
        {new: true}
    )
        .then(() => (
            course.save()
        ))
        .then(savedCourse => {
            return res.json({
                message: 'Your course has been created successfully',
                course: savedCourse
            })
        })
        .catch(err => handleError(err, res))
};
exports.createCourse = createCourse;

/**
 * @type function
 * @description Extracts new course data and files' metadata
 * from the received FormData which is used to update the course.
 * New course data is saved under `req.newCourse` and
 * the positions of entries that contain
 * newly uploaded files are saved under `req.filesPositions`
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {Object} req.body
 * @param {string} req.body.newCourse
 * @param {string} req.body.filesPosition
 * @param {models.Course} req.newCourse
 * @param {{section: number, entry: number}[]} [req.filesPositions]
 * @param {function} next
 * @memberOf controllers.courses.courseData
 */
const getNewCourseData = (req, res, next) => {
    try {
        req.newCourse = JSON.parse(req.body.newCourse);
        req.filesPositions = req.body.filesPositions && JSON.parse(req.body.filesPositions);
    } catch (err) {
        return handleError(err, res);
    }
    return next();
}
exports.getNewCourseData = getNewCourseData;

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
 * @param {models.Course} req.newCourse
 * @param {models.Course.Entry[]} req.updatesNewEntries
 * @param {models.Course.Entry[]} req.updatesDeletedEntries
 * @param {models.Course.Entry[]} req.entriesToDelete
 * @param {models.Exercise[]} req.updatesNewExercises
 * @param {models.Exercise[]} req.updatesDeletedExercises
 * @param {models.Exercise[]} req.exercisesToDelete
 * @param {function} next
 * @memberOf controllers.courses.courseData
 */
const cleanupCourseData = (req, res, next) => {
    let { course, newCourse } = req;
    const UNCHANGED = 'unchanged';
    let oldEntries = {}, newEntries = [], oldExercises = {}, newExercises = [];
    // find out which entries have been added and which ones have been removed
    if (Array.isArray(newCourse.sections)) {
        // mark all entries, that existed in the old course data
        course.sections.forEach(s => Array.isArray(s.entries) && s.entries.forEach(
            e => oldEntries[e._id.toString()] = {...e._doc}
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
    req.entriesToDelete = entriesToDelete.map(e => e._id);

    // find out which exercises have been added and which ones have been removed
    if (Array.isArray(newCourse.exercises)) {
        // mark all exercises, that existed in the old course data
        course.exercises.forEach(e => oldExercises[e._id.toString()] = {...e._doc})
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
    req.exercisesToDelete = exercisesToDelete.map(e => e._id);
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
 * @memberOf controllers.courses.courseData
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
 * @description Extracts new course data and files metadata
 * from the received FormData which is used to update the course.
 * New course data is saved under `req.newCourse` and
 * the positions of entries that contain
 * newly uploaded files are saved under `req.filesPositions`
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {Object} req.body
 * @param {string} req.body.course
 * @param {string} req.body.filesPosition
 * @param {models.Course} req.newCourse
 * @param {{section: number, entry: number}[]} [req.filesPositions]
 * @memberOf controllers.courses.courseData
 */
const updateCourse = (req, res) => {
    let {newCourse, course, filesPositions, files} = req, promises = [];

    if (Array.isArray(filesPositions)){
        if (filesPositions.length !== files.length){
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

            let curEntry = newCourse.sections[f.section].entries[f.entry];
            if (files[i] && files[i].id){
                curEntry.file = files[i].id;
            } else {
                curEntry.file = null;
                curEntry.fileName = 'No file yet'
            }
            newCourse.sections[f.section].entries[f.entry] = curEntry;
        })
    }

    if (Array.isArray(newCourse.sections)){
        newCourse.sections.forEach((s, i) => {
            s.entries.forEach((e, j) => {
                if (e.kind === 'EntryForum'){
                    if (!e.forum._id){
                        newCourse.sections[i].entries[j].forum = new Forum(
                            {...e.forum, courseRefs: [course._id], name: e.name}
                        );
                        promises.push(newCourse.sections[i].entries[j].forum.save());
                    } else {
                        promises.push(new Promise((resolve, reject) => {
                            Forum.findById(e.forum._id)
                                .then(forum => {
                                    let newData =
                                        {...e.forum, name: e.name};
                                    delete newData._id;
                                    forum = extend(forum, newData);
                                    return forum.save();
                                })
                                .then(forum => resolve(forum))
                                .catch(err => reject(err))
                        }))
                    }
                }
                if (!e._id) {
                    newCourse.sections[i].entries[j] =
                        new Entry({...e, courseRef: course._id});
                    promises.push(newCourse.sections[i].entries[j].save());
                } else {
                    promises.push(new Promise((resolve, reject) => {
                        Entry.findById(e._id)
                            .then(entry => {
                                entry = extend(entry, newCourse.sections[i].entries[j]);
                                return entry.save();
                            })
                            .then(entry => resolve(entry))
                            .catch(err => reject(err))
                    }))
                }
            })
        })
    }

    //TODO disallow changing certain fields (like updates/teachers/...)

    if (Array.isArray(newCourse.exercises)){
        newCourse.forEach((e, i) => {
            if (!e._id){
                newCourse.exercises[i] = new Exercise(e);
                promises.push(newCourse.exercises[i].save());
            } else {
                promises.push(new Promise((resolve, reject) => {
                    Exercise.findById(e._id)
                        .then(exercise => {
                            exercise = extend(exercise, newCourse.exercises[i]);
                            return exercise.save();
                        })
                        .then(ex => resolve(ex))
                        .catch(err => reject(err))
                }))
            }
        })
    }
    try {
        course = extend(course, newCourse);
        req.course = course;
    } catch (err) {
        return handleError(err, res);
    }
    return Promise.all(promises)
        .then(() => course.save())
        .then(result => {res.json(result)})
        .catch(err => {handleError(err, res)})
}
exports.updateCourse = updateCourse;

exports.enrollInCourse = (req, res) => {
    let {course} = req;
    if (course.hasPassword && !course.checkPassword(req.body.password)) {
        return res.status(401).json({
            error: {
                status: 401,
                message: 'wrong course password'
            }
        })
    }
    course.students.push(req.auth);
    return course.save()
        .then(() => //add the course to user's list of enrolled courses
            User.findByIdAndUpdate(
                req.auth._id,
                {$push: {enrolledCourses: { _id: course._id }}},
                {new: true}
            )
        )
        .then(() => (
            res.json({ message: 'Enrollment successful' })
        ))
        .catch(err => {handleError(err, res)})
}

exports.getCoursesFiltered = async (req, res) => {

    //!!! add validation for sane request (e. g. can't POST enrolled + teacher)
    let filter = {}, usersToPopulate = [], usersToPopulateSet = {}, courses;
    if (req.body.courseId){
        filter._id = req.body.courseId;
    }
    if (req.body.type){
        filter.type = req.body.type;
    }
    if (req.body.enrolled){
        await User.findOne({_id: req.body.enrolled})
            .populate('enrolledCourses', '_id')
            .then(user => {
                filter._id = {
                    $in: user.enrolledCourses
                }
            })
            .catch(err => {
                console.log(err);
                res.status(err.status || 400)
                    .json({
                        error: err
                    })
            })

    }
    if (req.body.teacher){
        await User.findOne({_id: req.body.teacher})
            .populate('teacherCourses', '_id')
            .then(user => {
                filter._id = {
                    $in: user.teacherCourses
                }
            })
            .catch(err => {
                console.log(err);
                res.status(err.status || 400)
                    .json({
                        error: err
                    })
            })
    }
    if (req.body.searchWord){
        let reOptions = {
            $regex: req.body.searchWord,
            $options: 'i'
        }
        filter.$or = [
            { name: reOptions },
            { about: reOptions }
        ]
    }
    let basicUserFields = ['name', 'photo', '_id', 'hiddenFields'];
    Course.find({...filter})
        //maybe select only necessary info
        .populate({path: 'students', select: basicUserFields})
        .populate({path: 'teachers', select: basicUserFields})
        .populate({path: 'creator', select: basicUserFields})
        .populate('exercises' )
        .populate('sections.entries')
        .populate({
            path: 'sections.entries',
            populate: {
                path: 'forum',
                select:['name', 'description', 'teachersOnly']
            }
        })
        .sort('name')
        .then(foundCourses => {
            courses = foundCourses;
            //console.log('fc', foundCourses);
            /*
                So many checks are used here to provide privacy - users shouldn't see course data, which they aren't meant to receive
             */
            let userStatuses = [];
            for (let i = 0; i < courses.length; i++){
                userStatuses.push('');
            }
            for (let i = 0; i < courses.length; i++){
                userStatuses[i] = 'not enrolled';
                courses[i].salt = undefined;
                courses[i].hashed_password = undefined;
                if (courses[i].type === 'public'){
                    continue;
                }
                if (!req.auth){
                    courses[i].sections = undefined;
                    courses[i].actions = undefined;
                    courses[i].students = undefined;
                    courses[i].creator = undefined;
                    courses[i].updates = undefined;
                    courses[i].exercises = undefined;
                    continue;
                }

                if (courses[i].invitedTeachers){
                    let invitedTeachers = cloneDeep(courses[i].invitedTeachers);
                    courses[i].invitedTeachers = undefined;
                    for (let invited of invitedTeachers){
                        if (invited.equals(req.auth._id)){
                            courses[i].invitedTeachers = invitedTeachers;
                            userStatuses[i] = 'invited teacher';
                            break;
                        }
                    }
                }

                let isTeacher = false, isStudent = false;

                for (let student of courses[i].students){
                    if (student.equals(req.auth._id)){
                        isStudent = true;
                        userStatuses[i] = 'student';
                    }
                    if (student && student.hideFields){
                        student.hideFields();
                    }
                }
                for (let teacher of courses[i].teachers){
                    if (teacher.equals(req.auth._id)){
                        isTeacher = true;
                        userStatuses[i] = 'teacher';
                    }
                    if (teacher && teacher.hideFields){
                        teacher.hideFields();
                    }
                }
                if (courses[i].creator && courses[i].creator.hideFields){
                    courses[i].creator.hideFields();
                }

                if (courses[i].creator && courses[i].creator._id.equals(req.auth._id)){
                    userStatuses[i] = 'creator';
                    continue;
                }
                if (isTeacher){
                    continue;
                }
                if (isStudent){
                    courses[i].creator = undefined;
                    continue;
                }

                courses[i].creator = undefined;
                courses[i].actions = undefined;
                courses[i].sections = undefined;
                courses[i].students = undefined;
                courses[i].updates = undefined;
                courses[i].exercises = undefined;
            }

            //Populating different fields in this loop
            //This loop can be used not only for forums, but for all other types of entries

            for (let c = 0; c < courses.length; c++){
                if (!courses[c].sections){
                    continue;
                }

                let exercises = [];


                for (let i = 0; i < courses[c].exercises.length; i++){
                    let exercise = courses[c].exercises[i];

                    if (!(userStatuses[c] === 'teacher' || userStatuses[c] === 'creator')){

                        exercise.tasks = undefined;
                        exercise.participants = undefined;

                        if (exercise.available){
                            exercises.push(exercise)
                        }
                    } else {
                        exercises.push(exercise);
                        for (let p of exercise.participants){
                            if (!usersToPopulateSet[p.user._id]){
                                usersToPopulateSet[p.user._id] = 1;
                                usersToPopulate.push(p.user._id);
                            }
                        }
                    }


                }


                courses[c].exercises = exercises;



                for (let i = 0; i < courses[c].sections.length; i++){
                    let section = cloneDeep(courses[c].sections[i]);
                    section.entries = [];
                    for (let j = 0; j < courses[c].sections[i].entries.length; j++){
                        let entry = courses[c].sections[i].entries[j];

                        if (entry.access === 'teachers' &&
                            !(userStatuses[c] === 'teacher' || userStatuses[c] === 'creator')
                        ){
                            continue;
                        } else {
                            section.entries.push(entry);
                        }

                        if (entry.type === 'forum'){

                            //populate topic creators and posts creators
                            for (let topic of entry.content.topics){
                                if (!usersToPopulateSet[topic.creator._id]){
                                    usersToPopulateSet[topic.creator._id] = 1;
                                    usersToPopulate.push(topic.creator._id);
                                }

                                for (let post of topic.posts){
                                    if (!usersToPopulateSet[post.creator._id]){
                                        usersToPopulateSet[post.creator._id] = 1;
                                        usersToPopulate.push(post.creator._id);
                                    }
                                }
                            }
                        }
                    }
                    courses[c].sections[i] = section;
                }
            }

            return User.find({
                _id: {
                    $in: usersToPopulate
                }
            })
        })
        .then((users) => {
            for (let user of users){
                user.hideFields();
                usersToPopulateSet[user._id] = user;
            }

            for (let c = 0; c < courses.length; c++){
                if (!courses[c].sections){
                    continue;
                }

                for (let i = 0; i < courses[c].sections.length; i++){
                    for (let j = 0; j < courses[c].sections[i].entries.length; j++){
                        let entry = courses[c].sections[i].entries[j];

                        if (entry && entry.type === 'forum'){

                            //populate topic creators and posts creators
                            for (let t = 0;
                                 t < courses[c]
                                     .sections[i]
                                     .entries[j]
                                     .content
                                     .topics
                                     .length;
                                 t++
                            ){
                                courses[c]
                                    .sections[i]
                                    .entries[j]
                                    .content
                                    .topics[t]
                                    .creator =
                                    usersToPopulateSet[courses[c]
                                        .sections[i]
                                        .entries[j]
                                        .content
                                        .topics[t]
                                        .creator
                                        ._id
                                        ];

                                for (let p = 0;
                                     p < courses[c]
                                         .sections[i]
                                         .entries[j]
                                         .content
                                         .topics[t]
                                         .posts
                                         .length;
                                     p++
                                ){
                                    courses[c]
                                        .sections[i]
                                        .entries[j]
                                        .content
                                        .topics[t]
                                        .posts[p]
                                        .creator =
                                        usersToPopulateSet[courses[c]
                                            .sections[i]
                                            .entries[j]
                                            .content
                                            .topics[t]
                                            .posts[p]
                                            .creator
                                            ._id
                                            ];
                                }
                            }
                        }
                    }
                }

                for (let i = 0; i < courses[c].exercises.length; i++){
                    if (courses[c].exercises[i].participants){
                        for (let j = 0; j < courses[c].exercises[i].participants.length; j++){
                            courses[c]
                                .exercises[i]
                                .participants[j]
                                .user =
                                usersToPopulateSet[courses[c]
                                    .exercises[i]
                                    .participants[j]
                                    .user
                                    ._id
                                    ];
                        }
                    }
                }
            }

            return new Promise((resolve) => {
                resolve(true);
            })
        })
        .then(() => {
            if (req.body.select){
                let selectSet = {};
                for (let s of req.body.select){
                    selectSet[s] = 1;
                }
                for (let i = 0; i < courses.length; i++){
                    for (let v of Object.keys(courses[i]._doc)){
                        if (!selectSet[v]){
                            courses[i][v] = undefined;
                        }
                    }
                }
            }


            return res.json(courses);
        })
        .catch(err => {
            console.log(err);
            res.status(err.status || 400)
                .json({
                    error: err
                })
        })
}

/**
 * @type function
 * @description deletes the course from the database. Please use this
 * {@link controllers.courses.courseData.removeCourseMentions cleanup controller}
 * to remove all references to this course beforehand.
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {models.User} req.auth
 * @memberOf controllers.courses.courseData
 */
const deleteCourse = (req, res) => {
    return Course.deleteOne({ _id: req.course._id})
        .then(() => {
            return res.json({ message: 'course deleted successfully'})
        })
        .catch(err => handleError(err, res))
}
exports.deleteCourse = deleteCourse;

/**
 * @type function
 * @description removes all references to the course from
 * all its members (students/teachers). Also removes
 * the exercises/forums/etc. inside the course if
 * this course is the only place where these
 * exercises/forums are used
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {models.User} req.auth
 * @param {function} next
 * @memberOf controllers.courses.courseData
 */
const removeCourseMentions = (req, res, next) => {
    //TODO remove exercises/forums/entries documents if they
    // only have one single courseRef which is the course to be deleted
    let filesToDelete = [], {course} = req;

    course.sections.forEach(s => s.entries.forEach(
        e => (e.kind === 'EntryFile') && filesToDelete.push(e.file)
    ))
    req.filesToDelete = filesToDelete;
    let usersWithRefs = [...course.subscribers, ...course.teachers, ...course.students];
    return User.find({ _id: { $in: usersWithRefs}})
        .then(users => {
            let promises = [];
            for (let u of users){
                let index = u.subscribedCourses.findIndex(
                    c => c.course.equals(course._id)
                )
                if (index >= 0) u.subscribedCourses.splice(index, 1);

                index = u.enrolledCourses.findIndex(c => c.equals(course._id));
                if (index >= 0) u.enrolledCourses.splice(index, 1);

                if (Array.isArray(u.teacherCourses)){
                    index = u.teacherCourses.findIndex(c => c.equals(course._id));
                    if (index >= 0) u.teacherCourses.splice(index, 1);
                }

                promises.push(u.save());
            }
            return Promise.all(promises);
        })
        //TODO iterate through all exercises and call exercise.cleanup()
        // this method should remove all tasks
        .then(() => next())
        .catch(err => handleError(err, res))
}
exports.removeCourseMentions = removeCourseMentions;



/**
 * @type function
 * @throws 401
 * @description Sends the summary on all exercises in which the specified user has
 * participated. Teacher can view summary for all students in their course
 * In order to get info about all students, specify
 * the query param `?all` and set its value to something truthy. If the query is not specified
 * than only the summary for the authenticated user will be sent
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {models.User} req.auth
 * @param {string} req.userCourseStatus
 * @param {string} [req.query.all]
 * @memberOf controllers.courses.courseData
 * TODO add normal docs for this
 */
const getExerciseSummary = (req, res) => {
    //TODO refactor this
    let userIsTeacher =
        (req.userCourseStatus === 'teacher') || (req.userCourseStatus === 'creator')
    let course = req.course;
    let usersSet = {}, usersToPopulate = []
    if (req.query.all){
        // only teachers can view summaries for all students
        if (!userIsTeacher){
            return res.status(401).json({
                error: {
                    status: 401,
                    message: 'Only teachers can view summary on all students'
                }
            })
        }
        for (let e of course.exercises){
            for (let p of e.participants){
                // Add to the map of exercise participants
                usersSet[p.user._id] = true;
                usersToPopulate.push(p.user._id)
            }
        }
    } else {
        usersSet[req.auth._id] = true;
        usersToPopulate = [req.auth._id];
    }

    return User.find({
        _id: { $in: usersToPopulate }
    })
        .then((users) => {
            for (let u of users) {
                usersSet[u._id] = {
                    userId: u._id,
                    userName: u.name,
                    exercises: []
                }
            }


            // Has only one loop through all exercises for efficiency
            for (let e of course.exercises){
                for (let p of e.participants){
                    if (!usersSet[p.user._id]){
                        continue;
                    }
                    // remove answers in the final response,
                    // they are irrelevant for this request
                    for (let a = 0; a < p.attempts.length; a++){
                        p.attempts[a].answers = undefined;
                    }
                    usersSet[p.user._id].exercises.push({
                        id: e._id,
                        name: e.name,
                        attempts: p.attempts
                    })
                }
            }

            let result = [];

            for (let k of Object.keys(usersSet)){
                result.push(usersSet[k])
            }

            return res.json(result);
        })
        .catch(err => {
            console.log(err);
            return res.status(err.status || 400)
                .json({
                    error: err
                })
        })
}
exports.getExerciseSummary = getExerciseSummary;