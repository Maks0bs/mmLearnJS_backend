let Course = require('../model')
let User = require('../../users/model');
const {handleError} = require("../../helpers");
let {cloneDeep} = require('lodash')
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

    //TODO this is newly added, might not function
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

    console.log(contentPromises);

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