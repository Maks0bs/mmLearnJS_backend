let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
/**
 * @class ExerciseParticipant
 * @memberOf models.Exercise
 * @name ExerciseParticipant
 * @property {ObjectId|models.User} user
 * @property {ObjectId[]|models.Exercise.ExerciseAttempt[]} attempts
 */
/**
 * @class Exercise
 * @memberOf models
 * @name Exercise
 * @property {ObjectId} _id
 * @property {string} name
 * @property {ObjectId[]|models.Course[]} courseRefs
 * @property {ObjectId[]|models.Exercise.ExerciseTask[]} tasks
 * @property {boolean} available
 * @property {number} weight
 * @property {models.Exercise.ExerciseParticipant[]} participants
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Exercise:
 *       type: object
 *       required:
 *         - name
 *         - weight
 *         - tasks
 *       properties:
 *         name:
 *           type: string
 *         available:
 *           type: boolean
 *         weight:
 *           type: number
 *         tasks:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/ExerciseTask'
 *               - $ref: '#/components/schemas/ObjectId'
 *         courseRefs:
 *           type: array
 *           description: >
 *             the list of courses, the teachers of which
 *             are allowed to edit the exercise
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/Course'
 *               - $ref: '#/components/schemas/ObjectId'
 *         participants:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - user
 *               - attempts
 *             properties:
 *               user:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/User'
 *                   - $ref: '#/components/schemas/ObjectId'
 *               attempts:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/ExerciseAttempt'
 *                   - $ref: '#/components/schemas/ObjectId'
 */
let courseExerciseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    courseRefs: [
        {
            type: ObjectId,
            ref: 'Course'
        }
    ],
    participants: [
        {
            user: {
                type: ObjectId,
                ref: 'User',
                required: 'The ref to the participant is required'
            },
            attempts: [
                {
                    type: ObjectId,
                    ref: 'ExerciseAttempt'
                }
            ]
        }
    ],
    tasks: [
        {
            type: ObjectId,
            ref: 'ExerciseTask'
        }
    ],
    available: {
        type: Boolean,
        required: true
    },
    weight: {
        type: Number,
        required: true,
        default: 1
    }
}, {
    discriminatorKey: 'kind',
    autoCreate: true
})
courseExerciseSchema.methods = require('./methods').exerciseMethods

let Exercise = mongoose.model('Exercise', courseExerciseSchema);
module.exports = Exercise;