const {handleError} = require("../../helpers");

/**
 * @type function
 * @description sends the exercise attempt from `req.attempt` as a response
 * @param {models.Exercise.ExerciseAttempt} req.attempt
 * @param {e.Request} req
 * @param {e.Response} res
 * @memberOf controllers.exercises
 */
const getAttempt = (req, res) => {
    req.attempt.exerciseRef = req.attempt.exerciseRef._id;
    return res.json(req.attempt);
}
exports.getAttempt = getAttempt;

/**
 * @type function
 * @throws 400, 403
 * @description updates the attempt under `req.attempt` with new
 * answers' data from the `req.body`
 * @param {models.Exercise.ExerciseAttempt} req.attempt
 * @param {models.Exercise.ExerciseAttemptAnswer[]} req.body
 * @param {string} req.userAttemptStatus
 * @param {models.User} req.auth
 * @param {e.Request} req
 * @param {e.Response} res
 * @memberOf controllers.exercises
 */
const updateAttemptAnswers = (req, res) => {
    let newAnswers = req.body, {attempt} = req;
    let { answers } = attempt;
    if (attempt.endTime && req.userAttemptStatus === 'student'){
        return res.status(403).json({
            error: {
                status: 403,
                message: 'Cannot update attempt, it is already finished'
            }
        })
    }
    if (newAnswers.length !== answers.length){
        return res.status(400).json({
            error: {
                status: 400,
                message: 'Wrong amount of answers in the new attempt data'
            }
        })
    }
    for (let i = 0; i < newAnswers.length; i++){
        // verify that new answers are in correct order
        if (newAnswers[i].taskRef !== answers[i].taskRef._id.toString()){
            return res.status(400).json({
                error: {
                    status: 400,
                    message: 'The order of new answers is incorrect or answers ' +
                        'to some tasks are missing'
                }
            })
        }
        // do not let modification of answer score
        newAnswers[i].score = answers[i].score;

        switch(newAnswers[i].kind){
            case 'MultipleChoiceTaskAttempt': {
                if (!newAnswers[i].values){
                    newAnswers[i].values = [];
                }
                break;
            }
            case 'TextTaskAttempt':
            case 'OneChoiceTaskAttempt':
            default: {
                if (newAnswers[i].value === undefined){
                    newAnswers[i].value = null;
                }
                break;
            }
        }
    }
    attempt.answers = newAnswers;
    return attempt.save()
        .then(savedAttempt => {
            savedAttempt.exerciseRef = savedAttempt.exerciseRef._id;
            return res.json(savedAttempt)
        })
        .catch(err => handleError(err, res))
}
exports.updateAttemptAnswers = updateAttemptAnswers;

/**
 * @type function
 * @throws 400, 403
 * @description Finishes the attempt with the given Id,
 * calculates the score for this attempt and saves the finish time
 * @param {models.Exercise.ExerciseAttempt} req.attempt
 * @param {string} req.userAttemptStatus
 * @param {models.User} req.auth
 * @param {e.Request} req
 * @param {e.Response} res
 * @memberOf controllers.exercises
 */
const finishAttempt = (req, res) => {
    let {attempt} = req, score = 0;
    let { tasks } = attempt.exerciseRef, { answers } = attempt;
    attempt.endTime = new Date();

    tasks.forEach((t, i) => {
        let taskScore = 0;
        switch (t.kind){
            case 'OneChoiceTask': {
                if (answers[i].value === t.correctAnswer) {
                    taskScore += t.score;
                }
                break;
            }
            case 'TextTask': {
                if (t.correctAnswers.indexOf(answers[i].value) >= 0){
                    taskScore += t.score;
                }
                break;
            }
            case 'MultipleChoiceTask': {
                let cntCorrect = 0;
                t.options.forEach(o => {
                    let optionIsCorrect = t.correctAnswers.indexOf(o.key) >= 0,
                        optionWasSelected = answers[i].values.indexOf(o.key) >= 0;
                    if (!(optionIsCorrect ^ optionWasSelected)){
                        cntCorrect++;
                    }
                })
                if (!t.onlyFull){
                    taskScore += t.score * (cntCorrect / t.options.length);
                } else {
                    taskScore += t.score * (cntCorrect === t.options.length);
                }
                break;
            }
        }
        score += taskScore;
        attempt.answers[i].score = taskScore;
    })
    attempt.score = score;

    return attempt.save()
        .then(savedAttempt => {
            savedAttempt.exerciseRef = savedAttempt.exerciseRef._id;
            return res.json(savedAttempt)
        })
        .catch(err => handleError(err, res))
}
exports.finishAttempt = finishAttempt;