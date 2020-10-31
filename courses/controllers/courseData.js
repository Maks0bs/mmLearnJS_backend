let Course = require('../model')
let User = require('../../users/model');
const {handleError} = require("../../helpers");
let {cloneDeep} = require('lodash')
let {USER_COURSE_STATUSES} = require('../model/methods').COURSE_DATA_CONSTANTS
let {NOT_ENROLLED, CREATOR, TEACHER, STUDENT, INVITED_TEACHER} = USER_COURSE_STATUSES



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
 * @memberOf controllers.courses
 */
const courseById = (req, res, next, id) => {
    return Course.findOne({_id: id})
        .populate({
            path: 'exercises',
            populate: [
                {path: 'tasks'},
                {
                    path: 'participants',
                    populate: [
                        {path: 'attempts'},
                        {path: 'user'}
                    ]
                }
            ]
        })
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
 * @memberOf controllers.courses
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
 * @description Extracts params that specify what kind of courses
 * should be found in the DB and sent via the
 * {@link controllers.courses.getCoursesFiltered getCoursesFiltered}
 * controller from the request query string. The appropriate filter object is stored
 * under `req.courseFilter` and is used for the
 * mongoose `model.find()` call
 * @param {e.Request} req
 * @param {models.User} req.auth
 * @param {Object} [req.courseFilter]
 * @param {Object} req.body
 * @param {e.Response} res
 * @param {models.Course.Entry} req.course
 * @param {function} next
 * @memberOf controllers.courses
 */
const configureCourseFilter = (req, res, next) => {
    //TODO add validation for sane request (e. g. can't POST enrolled + teacher)
    let filter = {}, {body} = req, filterPromises = []
    //TODO change body to req.query
    filter._id = body.courseId ? body.courseId : undefined;
    filter.type = body.type ? body.type : undefined;
    if (req.body.enrolled){
        filterPromises.push(User.findOne({_id: body.enrolled})
            .then(user => filter._id = {$in: user.enrolledCourses})
            .catch(err => handleError(err, res))
        )
    }
    if (body.teacher){
        filterPromises.push(User.findOne({_id: body.teacher})
            .then(user => filter._id = {$in: user.teacherCourses})
            .catch(err => handleError(err, res))
        )
    }
    if (body.searchWord){
        let reOptions = { $regex: body.searchWord, $options: 'i'}
        filter.$or = [ { name: reOptions }, { about: reOptions }]
    }
    Promise.all(filterPromises)
        .then(() => {
            req.courseFilter = filter;
            return next();
        })
}
exports.configureCourseFilter = configureCourseFilter;

//TODO add normal docs for this controller
const getCoursesFiltered = async (req, res) => {
    let {courseFilter: filter} = req, usersToPopulate = [], usersToPopulateSet = {},
        courses, basicUserFields = ['name', 'photo', '_id', 'hiddenFields'];
    //TODO replace usersToPopulate with .populate(...)
    return Course.find({...filter})
        .populate({path: 'students', select: basicUserFields})
        .populate({path: 'teachers', select: basicUserFields})
        .populate({path: 'creator', select: basicUserFields})
        .populate({
            path: 'exercises',
            populate: {
                path: 'tasks',
                select: '-__v'
            },
            select: '-__v -courseRefs'
        })
        .populate('sections.entries')
        .populate({
            path: 'sections.entries',
            populate: {
                path: 'forum',
                select:['name', 'description', 'teachersOnly']
            }
        })
        .sort({name: 'asc', type: 'desc'})
        .then(foundCourses => {
            courses = foundCourses;
            let userStatuses = courses.map(() => 'not enrolled')
            courses.forEach((c, i) => {
                userStatuses[i] = c.getUserCourseStatus(req.auth._id);
                courses[i].salt = undefined;
                courses[i].hashed_password = undefined;
                if (c.type === 'public') return;
                switch (userStatuses[i]) {
                    case NOT_ENROLLED: {
                        return courses[i].leavePublicData();
                    }
                    case CREATOR:
                    case TEACHER: {
                        return;
                    }
                    case INVITED_TEACHER:
                    case STUDENT: {
                        courses[i].creator = undefined;
                        courses[i].invitedTeachers = undefined;
                    }
                }
                if (Array.isArray(c.invitedTeachers)) c.invitedTeachers.forEach((t, j) => {
                    if (t && t.hideFields) courses[i].invitedTeachers[j].hideFields();
                })
                if (Array.isArray(c.students)) c.students.forEach((s, j) => {
                    if (s && s.hideFields) courses[i].students[j].hideFields();
                })
                if (Array.isArray(c.teachers)) c.teachers.forEach((t, j) => {
                    if (t && t.hideFields) courses[i].teachers[j].hideFields();
                })
                if (c.creator && c.creator.hideFields) courses[i].creator.hideFields();
            })

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
        .catch(err => {handleError(err, res)})
}


exports.getCoursesFiltered = getCoursesFiltered;

/**
 * @type function
 * @description configures the
 * {@link controllers.exercises.getFormattedExercises getExercises} controller
 * to get the exercises of the course, provided in `req.course`,
 * adding the ref to course data to the configuration object
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {string} req.userCourseStatus
 * @param {Object} req.exercisesConfig
 * @param {models.Course} req.exercisesConfig.course
 * @param {string} req.exercisesConfig.userStatus
 * @param {Object} req.exercisesConfig.filter
 * @param {function} next
 * @memberOf controllers.courses
 */
const getCourseExercisesConfigure = (req, res, next) => {
    let { course } = req;
    req.exercisesConfig = {
        course: course,
        userStatus: req.userCourseStatus,
        filter: {
            _id: { $in: course.exercises.map(e => e._id)}
        }
    }
    if (!course.exercises) return res.json([]);
    return next();
}
exports.getCourseExercisesConfigure = getCourseExercisesConfigure;

/**
 * @type function
 * @description deletes the course from the database. Please use this
 * {@link controllers.courses.removeCourseMentions cleanup controller}
 * to remove all references to this course beforehand.
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Course} req.course
 * @param {models.User} req.auth
 * @memberOf controllers.courses
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
 * @memberOf controllers.courses
 */
const removeCourseMentions = (req, res, next) => {
    let {course} = req, contentPromises = []
    let deleteOptions = { userId: req.auth._id, deleteFiles: true}

    try{
        course.sections.forEach(s =>
            s.entries.forEach(e => contentPromises.push(e.delete(deleteOptions)))
        )
        course.exercises.forEach(e => {
            let courseRefIndex = e.courseRefs.findIndex(c => c.equals(course._id))
            if (courseRefIndex >= 0){
                e.courseRefs.splice(courseRefIndex)
                if (e.courseRefs.length === 0){
                    contentPromises.push(e.delete(deleteOptions))
                } else {
                    contentPromises.push(e.save())
                }
            }
        });
    } catch (err) {
        console.log(err);
    }

    let usersWithRefs = [...course.subscribers, ...course.teachers, ...course.students];
    return Promise.all(contentPromises)
        .then(() => User.find({ _id: { $in: usersWithRefs}}))
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
        .then(() => next())
        .catch(err => {handleError(err, res)})
}
exports.removeCourseMentions = removeCourseMentions;