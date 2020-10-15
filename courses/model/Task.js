function choiceArrayValidator(arr){
    return arr.length >= 1;
}
function oneChoiceCorrectAnsValidator(){
    console.log('one choice', this);
    if (!this.correctAnswer){
        return false;
    }

    for (let i of this.options){
        if (i.key === this.correctAnswer){
            return true;
        }
    }

    return false;
}
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
        required: 'There should be a correct answer which is equal to one of the options in every one-choice exercise',
        validate: {
            validator: oneChoiceCorrectAnsValidator,
            message: 'There should be a correct answer which is equal to one of the options in every one-choice exercise'
        }
    }
})
let OneChoiceTask = ExerciseTask.discriminator('OneChoiceTask', oneChoiceTaskSchema);
exports.OneChoiceTask = OneChoiceTask;

function multipleChoiceCorrectAnsValidator(){
    if (!this.correctAnswers){
        return false;
    }

    let optionsSet = {};

    for (let i of this.options){
        optionsSet[i.key] = 1;
    }

    for (let i of this.correctAnswers){
        if (!optionsSet[i]){
            return false;
        }
    }

    return true;
}
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
        type: [
            {
                type: String
            }
        ],
        validate: {
            validator: multipleChoiceCorrectAnsValidator,
            message: 'Correct answers in multiple choice tasks should be the keys of other options of the given task'
        }
    },
    onlyFull: Boolean // if true, score for this exercise gets counted if all options are selected correctly
})
let MultipleChoiceTask = ExerciseTask.discriminator('MultipleChoiceTask', multipleChoiceTaskSchema);
exports.MultipleChoiceTask = MultipleChoiceTask;

let textTaskSchema = new mongoose.Schema({
    correctAnswers: [
        {
            type: String //has to be one of the keys
        }
    ],
    interpretMath: Boolean //TODO for future: interpret the answer as a math statement
})
let TextTask = ExerciseTask.discriminator('TextTask', textTaskSchema);
exports.TextTask = TextTask;