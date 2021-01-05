let Forum = require('../model');
let {ForumTopicPost} = require('../model/ForumTopicPost')
const {handleError} = require("../../helpers");

/**
 * @type function
 * @throws 400, 404
 * @description works with the `:forumId` param in the url. Adds all the data
 * about the forum with the ID the provided parameter. Adds all forum data to
 * the request object under the `req.forum` property
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Forum} req.forum
 * @param {function} next
 * @param {string} id - the id of the forum that should be found
 * @memberOf controllers.forum
 */
const forumById = (req, res, next, id) => {
    let basicUserFields = ['name', 'photo', '_id', 'hiddenFields'];
    return Forum.findOne({_id: id})
        .populate({
            path: 'topics',
            populate:{
                path: 'creator', select: basicUserFields
            }
        })
        .populate({
            path: 'topics.posts',
            populate:{
                path: 'creator', select: basicUserFields
            }
        })
        .then(forum => {
            if (!forum) throw {
                status: 404, error: 'Forum not found'
            }
            return forum;
        })
        .then(forum => {
            // hide fields of topic/post creators
            if (Array.isArray(forum.topics)) forum.topics.forEach((t, i) => {
                let newCreator = t.creator;
                newCreator.hideFields();
                forum.topics[i].creator = newCreator;
                if (Array.isArray(t.posts)) t.posts.forEach((p, j) => {
                    let newPostCreator = p.creator;
                    newPostCreator.hideFields();
                    forum.topics[i].posts[j].creator = newPostCreator;
                })
            })
            req.forum = forum;
            return next();
        })
        .catch(err => {handleError(err, res)})
}
exports.forumById = forumById;

/**
 * @type function
 * @throws 400, 404
 * @description works with the `:topicId` param in the url. Adds all the data
 * about the forum's topic with the ID in the provided parameter. Adds all topic data to
 * the request object under the `req.topic` property and also its index among other topics
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Forum} req.forum
 * @param {{data: ForumTopic, pos: number}} req.topic
 * @param {function} next
 * @param {string} topicId
 * @memberOf controllers.forum
 */
const topicById = (req, res, next, topicId) => {
    if (Array.isArray(req.forum.topics)){
        req.forum.topics.forEach((t, i) => {
            if (t._id.toString() === topicId){
                req.topic = { data: t, pos: i};
            }
        })
    }
    if (req.topic){
        return next();
    }
    return res.status(404).json({
        error: {
            status: 404,
            message: "No forum's topic with this id was found"
        }
    })
}
exports.topicById = topicById;

/**
 * @type function
 * @throws 400, 404
 * @description works with the `:postId` param in the url. Adds all the data
 * about the forum's topic post with the ID in the provided parameter.
 * Adds all post data to the request object under the `req.topic`
 * property and also its index among other posts in the parent topic
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Forum} req.forum
 * @param {{data: ForumTopicPost, pos: number}} req.post
 * @param {{data: ForumTopic, pos: number}} req.topic
 * @param {function} next
 * @param {string} postId
 * @memberOf controllers.forum
 */
const postById = (req, res, next, postId) => {
    if (Array.isArray(req.topic.data.posts)){
        req.topic.data.posts.forEach((p, i) => {
            if (p._id.toString() === postId){
                req.post = { data: p, pos: i};
            }
        })
    }
    if (req.post){
        return next();
    }
    return res.status(404).json({
        error: {
            status: 404,
            message: "No forum's topic post with this id was found"
        }
    })
}
exports.postById = postById;

/**
 * @type function
 * @throws 401
 * @description lets subsequent middleware get invoked
 * only if the authenticated user, who performs operations
 * with the forum under `req.forum` is a member of
 * a course, to which the mentioned forum has a reference (`courseRefs`)
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Forum} req.forum
 * @param {models.User} req.auth
 * @param {function} next
 * @memberOf controllers.forum
 */
const canAccessForum = (req, res, next) => {
    let memberCoursesSet = {};
    req.auth.enrolledCourses.forEach(c => memberCoursesSet[c] = true);
    if (Array.isArray(req.auth.teacherCourses)){
        req.auth.teacherCourses.forEach(c => memberCoursesSet[c] = true);
    }
    if(req.forum.courseRefs.findIndex(c => memberCoursesSet[c]) >= 0){
        return next();
    } else {
        return res.status(401).json({
            error: { status: 401, message: 'You are not allowed to access this forum'}
        })
    }
}
exports.canAccessForum = canAccessForum;

/**
 * @type function
 * @throws 401
 * @description lets subsequent middleware get invoked
 * only if the authenticated user is allowed to
 * modify the course, specified under `req.forum`.
 * If the authenticated user is a teacher,
 * who is allowed to modify the forum,
 * add set `req.isAuthorizedForumTeacher` to `true`
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Forum} req.forum
 * @param {models.User} req.auth
 * @param {boolean} req.isAuthorizedForumTeacher
 * @param {function} next
 * @memberOf controllers.forum
 */
const canEditForum = (req, res, next) => {
    let memberCoursesSet = {}, teacherCoursesSet = {};
    req.auth.enrolledCourses.forEach(c => memberCoursesSet[c] = true);
    if (Array.isArray(req.auth.teacherCourses)){
        req.auth.teacherCourses.forEach(c => {
            memberCoursesSet[c] = true
            teacherCoursesSet[c] = true
        });
    }
    let isMember = req.forum.courseRefs.findIndex(c => memberCoursesSet[c]) >= 0,
        isTeacher = req.forum.courseRefs.findIndex(c => teacherCoursesSet[c]) >= 0
    if (isTeacher){
        req.isAuthorizedForumTeacher = true;
    }
    if(isTeacher || (isMember && !req.forum.teachersOnly)){
        return next();
    } else {
        return res.status(401).json({
            error: { status: 401, message: 'You are not allowed to edit this forum'}
        })
    }
}
exports.canEditForum = canEditForum;


/**
 * @type function
 * @description deletes the forums with IDs,
 * specified under the array `req.forumsToDelete`.
 * This controller is async, the next middleware
 * gets invoked, the result of removing forums gets
 * added to `req.promises`
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {?Promise[]} req.promises
 * @param {models.Forum[]|ObjectId[]|string[]} req.forumsToDelete
 * @param {function} next
 * @memberOf controllers.forum
 */
const deleteForums = (req, res, next) => {
    if (!Array.isArray(req.promises)){
        req.promises = []
    }
    req.promises.push(new Promise((resolve, reject) => {
        Forum.deleteMany({_id: {$in: req.forumsToDelete } })
            .then(result => resolve(result))
            .catch(err => reject(err))
    }));
    return next();
}
exports.deleteForums = deleteForums;