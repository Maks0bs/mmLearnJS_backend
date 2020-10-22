let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;

/**
 * @class ForumTopic
 * @memberOf models.Forum
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
 * @memberOf models
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
 */
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
                require('./ForumTopicPost').forumTopicPostSchema
            ]
        }
    ]
})
let Forum = mongoose.model('Forum', forumSchema);
module.exports = Forum;