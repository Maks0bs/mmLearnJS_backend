let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
const {
    oneChoiceTaskSchema, multipleChoiceTaskSchema,
    textTaskSchema
} = require('./ExerciseTask')

/**
 * @class Exercise
 * @memberOf models.Course
 * @name Exercise
 * @property {ObjectId} _id
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Exercise:
 *       type: object
 *         required:
 *           - name
 *           - weight
 *           - tasks
 *         properties:
 *           name:
 *             type: string
 *           available:
 *             type: boolean
 *           weight:
 *             type: number
 *           tasks:
 *             type: array
 *             items:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ExerciseTask'
 *                 - $ref: '#/components/schemas/ObjectId'
 *           participants:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - user
 *                 - attempts
 *               properties:
 *                 user:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - $ref: '#/components/schemas/ObjectId'
 *                 attempts:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/ExerciseAttempt'
 *                     - $ref: '#/components/schemas/ObjectId'
 *
 *///TODO don't forget to check if docs are compiled correctly
let courseExerciseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
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
    discriminatorKey: 'kind'
})

let Exercise = mongoose.model('Exercise', courseExerciseSchema);
exports.Exercise = Exercise;
exports.courseExerciseSchema = courseExerciseSchema;

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// courseExerciseSchema.path('tasks').discriminator('OneChoiceTask', oneChoiceTaskSchema)
// courseExerciseSchema.path('tasks').discriminator('MultipleChoiceTask', multipleChoiceTaskSchema)
// courseExerciseSchema.path('tasks').discriminator('TextTask', textTaskSchema)