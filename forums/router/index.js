let {requireAuthentication} = require('../../users/controllers')
let {
    createForumTopic, answerTopicPost, topicById, postById,
    deleteTopicPost, getForumById, forumById, canAccessForum, canEditForum
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

/**
 * @swagger
 * path:
 *  /forum/:forumId:
 *    get:
 *      summary: >
 *        Returns the forum with the given ID if the user is a member of the
 *        course, to which the forum has a reference
 *      operationId: getForumById
 *      parameters:
 *        - name: forumId
 *          in: path
 *          description: >
 *            the id of the forum to perform operations with
 *          required: true
 *          type: string
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/forum/..."
 *      responses:
 *        "200":
 *          description: respond with all relevant forum data
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Forum'
 *        "400":
 *          description: Invalid forum ID
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: >
 *            unauthorized (unauthenticated / not allowed to view forum)
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
forumRouter.get('/',
    requireAuthentication,
    canAccessForum,
    getForumById
)

/**
 * @swagger
 * path:
 *  /forum/:forumId/new-topic:
 *    post:
 *      summary: >
 *        Creates a new topic in the forum with the given ID with the provided name and
 *        first post content
 *      description: >
 *        Creates a new topic in the forum with the given ID with the provided name and
 *        first post content if the user is a member of the
 *        course, to which the forum has a reference and the forum allows all members
 *        to create posts. If forum restricts creating posts for students,
 *        the mentioned member should be a teacher
 *      operationId: newForumTopic
 *      parameters:
 *        - name: forumId
 *          in: path
 *          description: >
 *            the id of the forum to perform operations with
 *          required: true
 *          type: string
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/forum/..."
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                name:
 *                  type: string
 *                content:
 *                  type: string
 *      responses:
 *        "200":
 *          description: respond with updated forum data
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Forum'
 *        "400":
 *          description: Invalid forum ID / invalid topic data
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: >
 *            unauthorized (unauthenticated / not allowed to edit forum)
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
forumRouter.post('/new-topic',
    requireAuthentication,
    canEditForum,
    createForumTopic,
)

/**
 * @swagger
 * path:
 *  /forum/:forumId/topic/:topicId/post/:postId/answer:
 *    post:
 *      summary: >
 *        Creates a new post as a response to the specified post in the
 *        specified forum and topic with the given post content
 *      description: >
 *        Creates a new post as a response to the specified post in the
 *        specified forum and topic with given post content
 *        if the user is a member of the course, to which the forum has a
 *        reference and the forum allows all members to create posts.
 *        If forum restricts creating posts for students,
 *        the mentioned member should be a teacher
 *      operationId: answerTopicPost
 *      parameters:
 *        - name: forumId
 *          in: path
 *          description: >
 *            the id of the forum to perform operations with
 *          required: true
 *          type: string
 *        - name: topicId
 *          in: path
 *          description: >
 *            the id of the wanted topic in the forum, mentioned above
 *          required: true
 *          type: string
 *        - name: postId
 *          in: path
 *          description: >
 *            the id of the wanted post in the topic, mentioned above
 *          required: true
 *          type: string
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/forum/..."
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                content:
 *                  type: string
 *      responses:
 *        "200":
 *          description: respond with updated forum data
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Forum'
 *        "400":
 *          description: Invalid forum ID / invalid post data
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: >
 *            unauthorized (unauthenticated / not allowed to edit forum)
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
forumRouter.post('/topic/:topicId/post/:postId/answer',
    requireAuthentication,
    canEditForum,
    answerTopicPost
)

/**
 * @swagger
 * path:
 *  /forum/:forumId/topic/:topicId/post/:postId/answer:
 *    delete:
 *      summary: >
 *        Delete the forum post with the specified ID. If the user is
 *        authorized (is a teacher), also remove the answers to this post
 *      description: >
 *        If the user is the teacher in a course to which the forum
 *        has a reference, then they are authorized to delete
 *        any post and any post tree (the post + its answers).
 *        Otherwise, the authorized member (student) in a referenced
 *        course can delete the posts only they created if they
 *        don't have any answers
 *      operationId: deleteTopicPost
 *      parameters:
 *        - name: forumId
 *          in: path
 *          description: >
 *            the id of the forum to perform operations with
 *          required: true
 *          type: string
 *        - name: topicId
 *          in: path
 *          description: >
 *            the id of the wanted topic in the forum, mentioned above
 *          required: true
 *          type: string
 *        - name: postId
 *          in: path
 *          description: >
 *            the id of the wanted post in the topic, mentioned above
 *          required: true
 *          type: string
 *      security:
 *        - cookieAuth: []
 *      tags:
 *        - "/forum/..."
 *      responses:
 *        "200":
 *          description: respond with updated forum data
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Forum'
 *        "400":
 *          description: Invalid forum ID
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 *        "401":
 *          description: >
 *            unauthorized (unauthenticated / not allowed to edit forum)
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Error'
 */
forumRouter.delete('/topic/:topicId/post/:postId',
    requireAuthentication,
    canEditForum,
    deleteTopicPost
)

forumRouter.param('topicId', topicById);
forumRouter.param('postId', postById);

router.use('/forum/:forumId', forumRouter)
router.param('forumId', forumById)
//reserved router for other forum-related endpoints
module.exports = router;