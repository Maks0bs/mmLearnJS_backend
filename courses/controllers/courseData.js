let Course = require('../model')
let User = require('../../users/model');
const {handleError} = require("../../helpers");
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
        // filter.name = reOptions
        // filter.about = reOptions
        filter.$or = [ { name: reOptions }, { about: reOptions }]
    }
    return Promise.all(filterPromises)
        .then(() => {
            req.courseFilter = filter;
            return next();
        })
}
exports.configureCourseFilter = configureCourseFilter;

//TODO add normal docs for this controller
const getCoursesFiltered = async (req, res) => {
    let {courseFilter: filter} = req, {select} = req.body,//TODO replace body with query
        basicUserFields = ['name', 'photo', '_id', 'hiddenFields'];
    console.log('filter', {...filter})
    for (let k in filter){
        if (filter.hasOwnProperty(k) && filter[k] === undefined){
            delete filter[k]
        }
    }
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
        .then(courses => {
            console.log('courses', courses)
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



            courses.forEach((c, i) => {
                if (!Array.isArray(c.sections)) return;
                let exercises = [], sections = []
                let isTeacher =
                    (userStatuses[c] === 'teacher' || userStatuses[c] === 'creator')
                if (Array.isArray(c.exercises)) c.exercises.forEach(e => {
                    if (!isTeacher){
                        e.tasks = undefined;
                        e.participants = undefined;
                        if (e.available){
                            exercises.push(e)
                        }
                    } else {
                        exercises.push(e);
                    }
                })
                courses[i].exercises = exercises;

                c.sections.forEach(s => {
                    let entries = []
                    if (Array.isArray(s.entries)) s.entries.forEach(e => {
                        if (e.access === 'teachers' && !isTeacher) return;
                        entries.push(e);
                        //TODO earlier there was population
                        // of topic / posts creators for forums
                    })
                    sections.push({...s, entries: entries})
                })
                courses[i].sections = sections
            })

            return courses;
        })
        .then(courses => {
            if (Array.isArray(select)){
                //TODO test this (if only necessary stuff is selected)
                let selectSet = {};
                select.forEach(s => selectSet[s] = true)
                courses.forEach((c, i) => {
                    Object.keys(c._doc).forEach(k => {
                        !selectSet[k] && (courses[i][k] = undefined)
                    })
                })
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