let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
/**
 * @class ForumTopicPost
 * @memberOf models.Forum.ForumTopic
 * @name ForumTopicPost
 * @property {ObjectId} _id
 * @property {string} content
 * @property {ObjectId|models.User} creator
 * @property {BSONDate} created
 * @property {BSONDate} [updated]
 * @property {ForumTopicPost[]|ObjectId} answers
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     ForumTopicPost:
 *       type: object
 *       properties:
 *         content:
 *           type: string
 *         creator:
 *           oneOf:
 *             - $ref: '#/components/schemas/User'
 *             - $ref: '#/components/schemas/ObjectId'
 *         created:
 *           $ref: '#/components/schemas/Date'
 *         updated:
 *           $ref: '#/components/schemas/Date'
 *         answers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ForumTopicPost'
 *           description: ref to another ForumTopicPost
 */
let forumTopicPostSchema = new mongoose.Schema({
    creator: {
        type: ObjectId,
        ref: 'User',
        required: 'Each forum post should have a creator'
    },
    created: {
        type: Date,
        default: Date.now
    },
    updated: Date,
    content: String,
    answers: [
        {
            type: ObjectId
            // should only reference ForumTopicPost
            // but posts don't get saved to the DB,
            // that's why there is no `ref` attribute
        }
    ]
})
let ForumTopicPost = mongoose.model('ForumTopicPost', forumTopicPostSchema);
exports.ForumTopicPost = ForumTopicPost;
exports.forumTopicPostSchema = forumTopicPostSchema;