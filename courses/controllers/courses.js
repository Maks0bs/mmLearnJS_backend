let Course = require('../model')
let User = require('../../users/model');
let { extend, isEqual, cloneDeep} = require('lodash');
const {formatMongooseError, handleError} = require("../../helpers");

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
 * @param {models.Course.Entry} req.course
 * @param {function} next
 * @param {string} id - the id of the course that should be found
 * @memberOf controllers.courses.courseData
 */
const courseById = (req, res, next, id) => {
    return Course.findOne({_id: id})
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
 * @description creates a new course with the given type and name. If the `hasPassword` attribute
 * is true, the course password should be provided as well. See {@link models.Course course model}
 * for details
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
        .then(savedCourse => (
            res.json({
                message: 'Your course has been created successfully',
                course: savedCourse
            })
        ))
        .catch(err => handleError(err, res))
};
exports.createCourse = createCourse;

exports.getNewCourseData = (req, res, next) => {
    req.newCourseData = JSON.parse(req.body.newCourseData);
    req.filesPositions = req.body.filesPositions && JSON.parse(req.body.filesPositions);
    console.log('body', req.body);
    console.log('filespos', req.filesPositions);
    next();
}

exports.cleanupCourseData = (req, res, next) => {
    // compare entries in found course with the one in req body
    // if compare file ids in both lists
    // if some ids that are in mongo course are not present in req body - delete them
    let curFiles = {}, curEntries = {}, newEntries = [], deletedEntries = [];
    if (!req.newCourseData.sections){
        return next();
    }
    for (let section of req.course.sections){
        for (let i of section.entries){
            if (i.type === 'file'){
                curFiles[i.content.id] = 'none';
            }
            curEntries[i._id] = {
                none: true,
                data: {
                    name: i.name,
                    type: i.type,
                    access: i.access
                }
            };
        }
    }

    for (let section of req.newCourseData.sections) {
        for (let i of section.entries){
            if (i.type === 'file'){
                curFiles[i.content.id] = 'exist'
            }
            if (i._id){
                curEntries[i._id] = 'exist';
            } else if (!(i.access === 'teachers')){
                newEntries.push({
                    name: i.name,
                    type: i.type
                })
            }
        }
    }

    let filesToDelete = [];
    for (let i of Object.keys(curFiles)) {
        if (curFiles[i] === 'none'){
            filesToDelete.push(i);
        }
    }
    for (let i of Object.keys(curEntries)){
        let cur = curEntries[i];
        if (cur !== 'exist' && cur.none && !(cur.data.access === 'teachers') ){
            deletedEntries.push({
                name: cur.data.name,
                type: cur.data.type
            })
        }
    }

    req.filesToDelete = filesToDelete;
    req.deletedEntries = deletedEntries;
    req.newEntries = newEntries;

    next();
}

// change update, add objectid handling
exports.updateCourse = async (req, res) => {
    let newCourseData = req.newCourseData;

    if (req.filesPositions){
        for (let i = 0; i < req.filesPositions.length; i++){
            let cur = req.filesPositions[i];
            if (req.files[i] && req.files[i].id){
                newCourseData.sections[cur.section].entries[cur.entry].content.file = req.files[i].id
            } else {
                newCourseData.sections[cur.section].entries[cur.entry].content.file = null;
                newCourseData.sections[cur.section].entries[cur.entry].content.fileName = 'No file yet';
            }

        }
    }

    let len = 0;
    if (newCourseData.sections){
        len = newCourseData.sections.length
    }

    for (let section = 0; section < len; section++){
        for (let i = 0; i < newCourseData.sections[section].entries.length; i++){
            let cur = newCourseData.sections[section].entries[i];
            if (!cur.content.kind){
                switch(cur.type){
                    case 'file': {
                        newCourseData.sections[section].entries[i].content.kind = 'EntryFile'
                        break;
                    }
                    case 'text': {
                        newCourseData.sections[section].entries[i].content.kind = 'EntryText'
                        break;
                    }
                    case 'forum': {
                        newCourseData.sections[section].entries[i].content.kind = 'EntryForum'
                        break;
                    }
                    default: {
                        newCourseData.sections[section].entries[i].content.kind = 'EntryContent'
                        break;
                    }
                }
            }
        }
    }



    let {course} = req;

    let prevInfo = {
        name: req.course.name,
        about: req.course.about
    }
    course = extend(course, newCourseData);

    //TODO add new updates when a new exercise gets released. Display it only if it has available == true




    //TODO if previously unavailable / hidden exercises or entries GET published, also add updates for this


    if (req.deletedEntries && req.deletedEntries.length > 0){
        course.updates.push({
            kind: 'UpdateDeletedEntries',
            deletedEntries: req.deletedEntries
        })
    }
    if (req.newEntries && req.newEntries.length > 0){
        course.updates.push({
            kind: 'UpdateNewEntries',
            newEntries: req.newEntries
        })
    }
    if (!isEqual(
        {name: course.name, about: course.about},
        prevInfo
    )
    ){
        course.updates.push({
            kind: 'UpdateNewInfo',
            oldName: prevInfo.name,
            newName: newCourseData.name,
            newAbout: newCourseData.about
        })
    }



    course.save()
        .then((result) => {
            return res.json(result);
        })
        .catch(err => {
            console.log(err);
            return res.status(err.status || 400)
                .json({
                    error: formatMongooseError(err) || err
                })
        })
}

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
    course.save()
        .then(() => {
            return User.findByIdAndUpdate(
                req.auth._id,
                {
                    $push: {
                        enrolledCourses: { _id: course._id }
                    }
                },
                {new: true}
            )
        })
        .then(result => {
            return res.json({
                message: 'You have successfully enrolled in the course'
            })
        })
        .catch(err => {
            console.log(err);
            return res.status(err.status || 400)
                .json({
                    error: err
                })
        })
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
        .sort('name')//TODO optimize sorting - see bookmarks
        .then(foundCourses => {
            courses = foundCourses;
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

exports.deleteCourse = (req, res) => {
    Course.deleteOne({ _id: req.course._id})
        .then(() => {
            res.json({
                message: 'course deleted successfully'
            })
        })
        .catch(err => {
            console.log(err);
            res.status(err.status || 400)
                .json({
                    error: err
                })
        })
    res.status(401).json({
        error:{
            message: 'kek',

        }
    })

}

exports.removeCourseMentions = (req, res, next) => {
    let filesToDelete = [], course = req.course;

    for (let s of course.sections){
        for (let e of s.entries){
            if (e.type === 'file'){
                filesToDelete.push(e.content.id);
            }
        }
    }

    User.find({ _id: { $in:
                [...course.subscribers, ...course.teachers, ...course.students]
        }})
        .then((users) => {
            for (let u of users){
                let index = -1;
                for (let c = 0; c < u.subscribedCourses.length; c++){
                    if (u.subscribedCourses[c].course.equals(course._id)){
                        index = c;
                        break;
                    }
                }
                if (index >= 0){
                    u.subscribedCourses.splice(index, 1);
                }

                index = -1;
                for (let c = 0; c < u.enrolledCourses.length; c++){
                    if (u.enrolledCourses[c].equals(course._id)){
                        index = c;
                        break;
                    }
                }
                if (index >= 0){
                    u.enrolledCourses.splice(index, 1);
                }

                if (u.teacherCourses){
                    index = -1;
                    for (let c = 0; c < u.teacherCourses.length; c++){
                        if (u.teacherCourses[c].equals(course._id)){
                            index = c;
                            break;
                        }
                    }
                    if (index >= 0){
                        u.teacherCourses.splice(index, 1);
                    }
                }



                u.save();
            }
        })
        .catch(err => {
            console.log(err);
            res.status(err.status || 400)
                .json({
                    error: err
                })
        })

    req.filesToDelete = filesToDelete;
    return next();
}

exports.entryById = (req, res, next, entryId) => {
    let len = 0;
    if (req.course.sections){
        len = req.course.sections.length
    }
    for (let section = 0; section < len; section++){
        for (let i = 0; i < req.course.sections[section].entries.length; i++){
            let entry = req.course.sections[section].entries[i];
            if(entry._id == entryId){
                req.entry = {
                    data: entry,
                    section: section,
                    pos: i
                }
                return next();
            }
        }
    }

    return res.status(404).json({
        error: {
            status: 404,
            message: "No entry with this id was found"
        }
    })
}

exports.getUpdatesNotifications = (req, res) => {
    let userSubbedSet = {};

    for (let c of req.auth.subscribedCourses) {
        userSubbedSet[c.course] = c.lastVisited;
    }

    Course.find({
        _id: {
            $in: req.body.courses
        }
    })
        .then((courses) => {
            let result = {};
            for (let c of courses){
                let lastVisited = userSubbedSet[c._id], curResult = 0;
                if (!lastVisited){
                    continue;
                }
                for (let u of c.updates){
                    if (u.created > lastVisited){
                        curResult++;
                    }
                }
                if (curResult > 0){
                    result[c._id] = curResult;
                }
            }


            return res.json(result);
        })
        .catch(err => {
            console.log(err);
            res.status(err.status || 400)
                .json({
                    error: formatMongooseError(err) || err
                })
        })
}

