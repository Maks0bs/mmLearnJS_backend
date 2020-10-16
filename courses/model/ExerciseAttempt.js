let mongoose = require('mongoose');
let { ObjectId } = mongoose.Schema;
/**
 * @class ExerciseAttemptAnswer
 * @memberOf models.Course.Exercise
 * @name ExerciseAttemptAnswer
 * @property {ObjectId|models.Course.Exercise.ExerciseAttempt} taskRef
 * @property {?number} score
 * @property {?string} [value]
 * @property {?string[]} [values]
 */
/**
 * @class ExerciseAttempt
 * @memberOf models.Course.Exercise
 * @name ExerciseAttempt
 * @property {ObjectId} _id
 * @property {ObjectId|models.User} respondent
 * @property {ObjectId|models.Course.Exercise} exerciseRef
 * @property {BSONDate} startTime
 * @property {?BSONDate} endTime
 * @property {ExerciseAttemptAnswer[]} answers
 * @property {?number} score
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     ExerciseAttempt:
 *       type: object
 *       required:
 *         - _id
 *         - respondent
 *         - exerciseRef
 *         - startTime
 *       properties:
 *         _id:
 *           $ref: '#/components/schemas/ObjectId'
 *         respondent:
 *           oneOf:
 *             - $ref: '#/components/schemas/User'
 *             - $ref: '#/components/schemas/ObjectId'
 *         exerciseRef:
 *           oneOf:
 *             - $ref: '#/components/schemas/User'
 *             - $ref: '#/components/schemas/ObjectId'
 *         startTime:
 *           $ref: '#/components/schemas/Date'
 *         endTime:
 *           $ref: '#/components/schemas/Date'
 *         score:
 *           type: number
 *         answers:
 *           type: array
 *           items:
 *             anyOf:
 *               - type: object
 *                 required:
 *                   - taskRef
 *                 properties:
 *                  taskRef:
 *                    oneOf:
 *                      - $ref: '#/components/schemas/ExerciseTask'
 *                      - $ref: '#/components/schemas/ObjectId'
 *                  score:
 *                    type: number
 *               - type: object
 *                 properties:
 *                   value:
 *                     type: string
 *               - type: object
 *                 properties:
 *                   values:
 *                     type: array
 *                     items:
 *                       type: string
 *///TODO don't forget to check if docs are compiled correctly
let attemptAnswerSchema = new mongoose.Schema({
    taskRef: {
        type: ObjectId,
        ref: 'ExerciseTask'
    },
    score: {
        type: Number,
        default: null
    }
}, {
    discriminatorKey: 'kind',
    _id: false
})

let AttemptAnswer = mongoose.model('AttemptAnswer', attemptAnswerSchema);
exports.AttemptAnswer = AttemptAnswer;
exports.attemptAnswerSchema = attemptAnswerSchema;

let oneChoiceTaskAttemptSchema = new mongoose.Schema({
    value: String
})

let OneChoiceTaskAttempt = AttemptAnswer.discriminator(
    'OneChoiceTaskAttempt', oneChoiceTaskAttemptSchema
);
exports.OneChoiceTaskAttempt = OneChoiceTaskAttempt;
exports.oneChoiceTaskAttemptSchema = oneChoiceTaskAttemptSchema;
// text tasks only have one answer option, the same as one choice tasks
let TextTaskAttempt = AttemptAnswer.discriminator(
    'TextTaskAttempt', oneChoiceTaskAttemptSchema
);
exports.TextTaskAttempt = TextTaskAttempt;
exports.textTaskAttemptSchema = oneChoiceTaskAttemptSchema;

let multipleChoiceTaskAttemptSchema = new mongoose.Schema({
    values: [
        String
    ]
})

let MultipleChoiceTaskAttempt = AttemptAnswer.discriminator(
    'MultipleChoiceTaskAttempt', multipleChoiceTaskAttemptSchema
);
exports.MultipleChoiceTaskAttempt = MultipleChoiceTaskAttempt
exports.multipleChoiceTaskAttemptSchema = multipleChoiceTaskAttemptSchema;

let exerciseAttemptSchema = new mongoose.Schema({
    respondent: {
        type: ObjectId,
        ref: 'User',
        required: 'The ref to the student, who attempts the exercise is required'
    },
    exerciseRef: {
        type: ObjectId,
        ref: 'User',
        required: 'The link to the exercise, which the attempt refers to, is required'
    },
    startTime: {
        type: Date,
        default: Date.now,
        required: 'The starting time of the attempt is required'
    },
    endTime: {
        type: Date,
        default: null,
        required: 'The ending time of the attempt is required'
    },
    answers: [
        attemptAnswerSchema
    ],
    score: {
        type: Number,
        default: null
    }
}, {
    discriminatorKey: 'kind'
})

let ExerciseAttempt = mongoose.model('ExerciseAttempt', exerciseAttemptSchema);
exports.ExerciseAttempt = ExerciseAttempt;
exports.exerciseAttemptSchema = exerciseAttemptSchema;

exerciseAttemptSchema.path('answers').discriminator(
    'OneChoiceTaskAttempt', oneChoiceTaskAttemptSchema
)
exerciseAttemptSchema.path('answers').discriminator(
    'MultipleChoiceTaskAttempt', multipleChoiceTaskAttemptSchema
)
exerciseAttemptSchema.path('answers').discriminator(
    'TextTaskAttempt', oneChoiceTaskAttemptSchema
)