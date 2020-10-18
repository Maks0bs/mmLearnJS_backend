let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
/**
 * @class ForumTopicPost
 * @memberOf models.Course.Forum.ForumTopic
 * @name ForumTopicPost
 * @property {ObjectId} _id
 * @property {string} content
 * @property {ObjectId|models.User} creator
 * @property {BSONDate} created
 * @property {BSONDate} [updated]
 * @property {ForumTopicPost[]|ObjectId} answers
 */
/**
 * @class ForumTopic
 * @memberOf models.Course.Forum
 * @name ForumTopic
 * @property {ObjectId} _id
 * @property {string} name
 * @property {ObjectId|models.User} creator
 * @property {BSONDate} created
 * @property {BSONDate} [updated]
 * @property {ForumTopicPost[]} posts
 */
/**
 * @class Forum
 * @memberOf models.Course
 * @name Forum
 * @property {ObjectId} _id
 * @property {string} name
 * @property {?string} description
 * @property {boolean} teachersOnly - set to true if you only want to allow teachers to post
 * @property {ObjectId[]|models.Course[]} courseRefs
 * @property {ForumTopic[]} topics
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
 *           $ref: '#/components/schemas/ForumTopicPost'
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Forum:
 *       allOf:
 *         - type: object
 *           required:
 *             - _id
 *             - name
 *           properties:
 *             _id:
 *               $ref: '#/components/schemas/ObjectId'
 *             name:
 *               type: string
 *             description:
 *               type: string
 *             teachersOnly:
 *               type: boolean
 *               description: >
 *                 set to true if only teachers should be allowed
 *                 to created posts at this forum
 *             courseRefs:
 *               type: array
 *               description: >
 *                 the list of courses, the members of which
 *                 are allowed to create posts at this forum
 *               items:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/Course'
 *                   - $ref: '#/components/schemas/ObjectId'
 *             topics:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   creator:
 *                     oneOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - $ref: '#/components/schemas/ObjectId'
 *                   created:
 *                     $ref: '#/components/schemas/Date'
 *                   updated:
 *                     $ref: '#/components/schemas/Date'
 *                   posts:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/ForumTopicPost'
 *///TODO don't forget to check if docs are compiled correctly
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

let forumSchema = new mongoose.Schema({
    name: {
        type: String,
        required: 'Forum name is required'
    },
    description: String,
    teachersOnly: Boolean,
    courseRefs: [
        {
            type: ObjectId,
            ref: 'Course'
        }
    ],
    topics: [
        {
            name: String,
            creator: {
                type: ObjectId,
                ref: 'User'
            },
            created: {
                type: Date,
                default: Date.now
            },
            updated: Date,
            posts: [
                forumTopicPostSchema
            ]
        }
    ]
})
let Forum = mongoose.model('Forum', forumSchema);
exports.Forum = Forum;
exports.forumSchema = forumSchema;