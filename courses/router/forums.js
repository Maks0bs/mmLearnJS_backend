let {
    userInCourse, requireAuthentication
} = require('../../users/controllers')
let {
    createForumTopic, answerTopicPost, topicById, postById,
    deleteTopicPost, getForumById
} = require('../controllers')

let router = require('express').Router()

//TODO maybe move all these routes to a separate directory (/forums/routes/...) and change url
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

//TODO change of frontend
router.get('/',
    requireAuthentication,
    userInCourse,
    getForumById
    //TODO check with a controller if the user is allowed to view the forum
    // (if it is a member of a course to which the forum has a ref)
)
//TODO change of frontend
router.post('/new-topic',
    requireAuthentication,
    userInCourse,
    createForumTopic,
    //TODO check with a controller if the user is allowed to edit the forum
    // (if it is a teacher of a course to which the forum has a reference)
)
//TODO change of frontend
router.post('/topic/:topicId/post/:postId/answer',
    requireAuthentication,
    userInCourse,
    answerTopicPost
    //TODO check with a controller if the user is allowed to edit the forum
    // (if it is a teacher of a course to which the forum has a reference)
)
//TODO change of frontend
router.delete('/topic/:topicId/post/:postId',
    requireAuthentication,
    userInCourse,
    deleteTopicPost
    //TODO check with a controller if the user is allowed to edit the forum
    // (if it is a teacher of a course to which the forum has a reference)
)

router.param('topicId', topicById);
router.param('postId', postById);

module.exports = router;