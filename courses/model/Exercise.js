let attemptAnswerSchema = new mongoose.Schema({
    taskRef: {
        type: ObjectId,
        required: true
    },
    score: {
        type: Number,
        default: null
    }
}, {
    discriminatorKey: 'kind'
})

let AttemptAnswer = mongoose.model('AttemptAnswer', attemptAnswerSchema);
exports.AttemptAnswer = AttemptAnswer;

let oneChoiceTaskAttemptSchema = new mongoose.Schema({
    value: String
})

let OneChoiceTaskAttempt = AttemptAnswer.discriminator(
    'OneChoiceTaskAttempt', oneChoiceTaskAttemptSchema);
exports.OneChoiceTaskAttempt = OneChoiceTaskAttempt;

// text tasks only have one answer option, the same as one choice tasks
let TextTaskAttempt = AttemptAnswer.discriminator(
    'TextTaskAttempt', oneChoiceTaskAttemptSchema);
exports.TextTaskAttempt = TextTaskAttempt;

let multipleChoiceTaskAttemptSchema = new mongoose.Schema({
    values: [ String ]
})

let MultipleChoiceTaskAttempt = AttemptAnswer.discriminator(
    'MultipleChoiceTaskAttempt', multipleChoiceTaskAttemptSchema);
exports.MultipleChoiceTaskAttempt = MultipleChoiceTaskAttempt;


let exerciseAttemptSchema = new mongoose.Schema({
    startTime: {
        type: Date,
        default: Date.now
        //TODO maybe make required
    },
    endTime: {
        type: Date,
        default: null
        //TODO maybe make required
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

exerciseAttemptSchema.path('answers').discriminator('OneChoiceTaskAttempt', oneChoiceTaskAttemptSchema)
exerciseAttemptSchema.path('answers').discriminator('MultipleChoiceTaskAttempt', multipleChoiceTaskAttemptSchema)
exerciseAttemptSchema.path('answers').discriminator('TextTaskAttempt', oneChoiceTaskAttemptSchema)

let exerciseTaskSchema = new mongoose.Schema({
    description: String,
    score: {
        type: Number,
        required: true
    }
}, {
    discriminatorKey: 'kind'
})

let ExerciseTask = mongoose.model('ExerciseTask', exerciseTaskSchema);
exports.ExerciseTask = ExerciseTask;

let courseExerciseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    participants: [
        {
            user: {
                type: ObjectId,
                ref: 'User'
            },
            attempts: [
                exerciseAttemptSchema
            ]
        }
    ],
    tasks: [
        exerciseTaskSchema
    ],
    available: {
        type: Boolean,
        required: true
    },
    weight: {//TODO if no weight gets received in the update request, set to 1. Add this to schema methods
        type: Number,
        required: true,
        default: 1
    }
}, {
    discriminatorKey: 'kind'
})

let Exercise = mongoose.model('CourseExercise', courseExerciseSchema);
exports.Exercise = Exercise;

courseExerciseSchema.path('tasks').discriminator('OneChoiceTask', oneChoiceTaskSchema)
courseExerciseSchema.path('tasks').discriminator('MultipleChoiceTask', multipleChoiceTaskSchema)
courseExerciseSchema.path('tasks').discriminator('TextTask', textTaskSchema)