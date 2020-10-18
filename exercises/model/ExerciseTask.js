let mongoose = require('mongoose');

/**
 * @class ExerciseTask
 * @memberOf models.Course.Exercise
 * @name ExerciseTask
 * @property {ObjectId} _id
 * @property {string} [description]
 * @property {?number} score
 */
/**
 * @class OneChoiceTask
 * @augments models.Course.Exercise.ExerciseTask
 * @memberOf models.Course.Exercise
 * @name OneChoiceTask
 * @property {{[text]: string, key: string}[]} options
 * @property {string} correctAnswer
 */
/**
 * @class MultipleChoiceTask
 * @augments models.Course.Exercise.ExerciseTask
 * @memberOf models.Course.Exercise
 * @name MultipleChoiceTask
 * @property {{[text]: string, key: string}[]} options
 * @property {string[]} correctAnswers
 * @property {boolean} onlyFull
 */
/**
 * @class TextTask
 * @augments models.Course.Exercise.ExerciseTask
 * @memberOf models.Course.Exercise
 * @name TextTask
 * @property {{[text]: string, key: string}[]} correctAnswers
 * @property {boolean} interpretMath
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     ExerciseTask:
 *       allOf:
 *         - type: object
 *           required:
 *             - _id
 *             - score
 *           properties:
 *             _id:
 *               $ref: '#/components/schemas/ObjectId'
 *             description:
 *               type: string
 *             score:
 *               type: number
 *               nullable: true
 *         - oneOf:
 *           - type: object
 *             required:
 *               - options
 *               - correctAnswer
 *             properties:
 *               correctAnswer:
 *                 type: string
 *                 description: should be one of the options' keys
 *               options:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     key:
 *                       type: string
 *           - type: object
 *             required:
 *               - options
 *               - correctAnswers
 *             properties:
 *               correctAnswers:
 *                 type: array
 *                 description: >
 *                   each correct answer should be one of the options' keys
 *                 items:
 *                   type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     key:
 *                       type: string
 *               onlyFull:
 *                 type: boolean
 *                 description: >
 *                   if true, only fully correct answers are accepted
 *                   (all correct answers selected, no wrong answers are selected)
 *           - type: object
 *             required:
 *               - options
 *               - correctAnswers
 *             properties:
 *               correctAnswers:
 *                 type: array
 *                 description: >
 *                   each correct answer should be one of the options' keys
 *                 items:
 *                   type: string
 *               interpretMath:
 *                 type: boolean
 *                 description: >
 *                   if true, students' answers
 *                   are interpreted as math expressions
 *///TODO don't forget to check if docs are compiled correctly
let exerciseTaskSchema = new mongoose.Schema({
    description: String,
    score: {
        type: Number,
        required: true
    }
    // there is no ref to the exercise,
    // because it enables more flexibility:
    // one task can be used in several exercises
}, {
    discriminatorKey: 'kind'
})

let ExerciseTask = mongoose.model('ExerciseTask', exerciseTaskSchema);
exports.ExerciseTask = ExerciseTask;
exports.exerciseTaskSchema = exerciseTaskSchema;

let choiceArrayValidator = function(arr){
    return Array.isArray(arr) && arr.length >= 1
};

let oneChoiceTaskSchema = new mongoose.Schema({
    options: {
        _id: false,
        type: [
            {
                text: String,
                key: String
            }
        ],
        validate: {
            validator: choiceArrayValidator,
            message: `There should be at least one option in every one-choice exercise`
        }
    },
    correctAnswer: {
        type: String,
        required: 'There should be a correct answer which is equal to one of ' +
            'the options in every one-choice exercise',
        validate: {
            validator: function(){
                if (!this.correctAnswer){
                    return false;
                }
                return this.correctAnswers
                    .findIndex(a => a.key === this.correctAnswer) > -1;
            },
            message: 'There should be a correct answer which is ' +
                'equal to one of the options in every one-choice exercise'
        }
    }
})
let OneChoiceTask = ExerciseTask.discriminator('OneChoiceTask', oneChoiceTaskSchema);
exports.OneChoiceTask = OneChoiceTask;
exports.oneChoiceTaskSchema = oneChoiceTaskSchema;

let multipleChoiceTaskSchema = new mongoose.Schema({
    options: {
        _id: false,
        type: [
            {
                text: String,
                key: String
            }
        ],
        validate: {
            validator: choiceArrayValidator,
            message: `There should be at least one option in every multiple-choice exercise`
        }
    },
    correctAnswers: {
        _id: false,
        type: [
            String
        ],
        validate: {
            validator: function(){
                if (!Array.isArray(this.correctAnswers)){
                    return false;
                }
                // all correct answers should be one of option keys
                return this.correctAnswers
                    .findIndex(a => !this.options.includes(a)) < 0;
            },
            message: 'Correct answers in multiple choice tasks ' +
                'should be the keys of other options of the given task'
        }
    },
    // if true, students only get score for this exercise
    // if all options were selected correctly and none were selected wrongly
    onlyFull: Boolean
})
let MultipleChoiceTask = ExerciseTask.discriminator(
    'MultipleChoiceTask', multipleChoiceTaskSchema
);
exports.MultipleChoiceTask = MultipleChoiceTask;
exports.multipleChoiceTaskSchema = multipleChoiceTaskSchema;

let textTaskSchema = new mongoose.Schema({
    correctAnswers: [
        String
    ],
    //interpret students' answers as a math statement
    interpretMath: Boolean
})
let TextTask = ExerciseTask.discriminator('TextTask', textTaskSchema);
exports.TextTask = TextTask;
exports.textTaskSchema = textTaskSchema;