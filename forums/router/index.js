let {
    userInCourse, requireAuthentication
} = require('../../users/controllers')
let {
    createForumTopic, answerTopicPost, topicById, postById,
    deleteTopicPost, getForumById, forumById
} = require('../controllers')

/**
 * @swagger
 * tags:
 *   name: /forum/...
 *   description: >
 *     All endpoints related to creating/updating forums and managing posts in them
 */
let forumRouter = require('express').Router()
let router = require('express').Router()

//TODO maybe move all these routes to a separate directory (/forums/routes/...) and change url
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

//TODO change of frontend
forumRouter.get('/',
    requireAuthentication,
    userInCourse,
    getForumById
    //TODO check with a controller if the user is allowed to view the forum
    // (if it is a member of a course to which the forum has a ref)
)
//TODO change of frontend
forumRouter.post('/new-topic',
    requireAuthentication,
    userInCourse,
    createForumTopic,
    //TODO check with a controller if the user is allowed to edit the forum
    // (if it is a teacher of a course to which the forum has a reference)
)
//TODO change of frontend
forumRouter.post('/topic/:topicId/post/:postId/answer',
    requireAuthentication,
    userInCourse,
    answerTopicPost
    //TODO check with a controller if the user is allowed to edit the forum
    // (if it is a teacher of a course to which the forum has a reference)
)
//TODO change of frontend
forumRouter.delete('/topic/:topicId/post/:postId',
    requireAuthentication,
    userInCourse,
    deleteTopicPost
    //TODO check with a controller if the user is allowed to edit the forum
    // (if it is a teacher of a course to which the forum has a reference)
)

forumRouter.param('topicId', topicById);
forumRouter.param('postId', postById);

router.use('/forum/:forumId', forumRouter)
router.param('forumId', forumById)
//reserved router for other forum-related endpoints
module.exports = router;