let { ExerciseAttempt } = require('../model');
let { assign } = require('lodash');

exports.exerciseById = (req, res, next, id) => {
    let { exercises } = req.courseData;
    for (let e = 0; e <exercises.length; e++){
        if (exercises[e]._id == id){
            req.exercise = {
                data: exercises[e],
                pos: e
            };
            return next();
        }
    }

    if (!req.exercise){
        return res.status(404).json({
            error: {
                status: 404,
                message: 'No exercise with such id has been found'
            }
        })
    }
}

exports.getExercise = (req, res) => {
    let exercise = req.exercise.data;
    let { participants } = exercise;
    if (req.userCourseStatus === 'student'){
        exercise.participants = undefined;
    } else {
        return res.json(exercise);
    }
    let hasActiveAttempt = false;

    for (let p of participants){
        if (p.user.equals(req.auth._id)){
            for (let a of p.attempts){
                if (!a.endTime){
                    hasActiveAttempt = true;
                    break;
                }
            }
        }
        if (hasActiveAttempt){
            break;
        }
    }

    if (!(hasActiveAttempt && exercise.available)){
        //Don't send tasks data if user is not currently doing the exercise or if the exercise is not available
        exercise.tasks = undefined;
    } else {

        //Otherwise remove correct answers from task data
        for (let t = 0; t < exercise.tasks.length; t++){
            exercise.tasks[t].correctAnswer = undefined;
            exercise.tasks[t].correctAnswers = undefined;
        }
    }

    return res.json(exercise);
}

exports.attemptById = async (req, res, next, id) => {
    let { exercise } = req;
    let { participants } = exercise.data;
    for (let p = 0; p < participants.length; p++) {
        if (participants[p].user.equals(req.auth._id)){
            let { attempts } = participants[p];
            for (let a = 0; a < attempts.length; a++){
                if (attempts[a]._id == id){
                    req.attempt = {
                        data: attempts[a],
                        participantPos: p,
                        attemptPos: a,
                        owner: participants[p].user
                    }
                    return next();
                }
            }
        }
    }

    if (!req.attempt){
        return res.status(404).json({
            error: {
                status: 404,
                message: 'No attempt with such id has been found'
            }
        })
    }
}

exports.getAttempt = (req, res) => {
    return res.json({
        attempt: req.attempt.data
    })
}

exports.correctAttemptOwner = (req, res, next) => {
    if (req.userCourseStatus === 'teacher' || req.userCourseStatus === 'creator'){
        return next();
    }

    if (req.userCourseStatus === 'student' && req.auth._id.equals(req.attempt.owner)){
        return next();
    }


    return res.status(401).json({
        error: {
            status: 401,
            message: 'You are not authorized to view this attempt'
        }
    })
}

exports.getExerciseAttempts = (req, res) => {
    let exercise = req.exercise.data;
    for (let p of exercise.participants) {
        if (p.user.equals(req.auth._id)){
            let attempts = p.attempts;
            attempts.sort((a, b) => {
                return a.startTime - b.startTime;
            })
            return res.json({
                attempts: attempts
            })
        }
    }

    return res.json({
        attempts: []
    });
}

exports.updateAttempt = (req, res) => {
    let newAttempt = req.body;
    let oldAttempt = req.attempt.data;

    if (oldAttempt.endTime){
        return res.status(400).json({
            error: {
                status: 400,
                message: 'Cannot update attempt, it is already finished'
            }
        })
    }

    //TODO put this part into model methods
    if (newAttempt.answers.length !== oldAttempt.answers.length){
        return res.status(400).json({
            error: {
                status: 400,
                message: 'Wrong attempt data'
            }
        })
    }

    // Don't let modify startTime and score - can only be changed in finishAttempt
    newAttempt.startTime = oldAttempt.startTime;
    newAttempt.score = oldAttempt.score;
    if (!newAttempt.endTime || (!oldAttempt.endTime && oldAttempt.endTime)){
        newAttempt.endTime = null;
    }

    let { answers: oldAnswers } = oldAttempt;
    let { answers: newAnswers } = newAttempt;

    for (let i = 0; i < newAnswers.length; i++){
        if (newAnswers[i].taskRef != oldAnswers[i].taskRef){
            //TODO validate taskRef AND position in array somehow
            return res.status(400).json({
                error: {
                    status: 400,
                    message: 'Wrong attempt data'
                }
            })
        }

        switch(newAnswers[i].kind){
            case 'MultipleAttemptAnswer': {
                if (!newAnswers[i].values){
                    newAnswers[i].values = [];
                }
                break;
            }
            case 'OneAttemptAnswer': {
                if (newAnswers[i].value === undefined){
                    newAnswers[i].value = null;
                }
                break;
            }
        }
    }

    newAttempt.answers = newAnswers;

    let course = req.courseData;

    assign(course.exercises[req.exercise.pos]
        .participants[req.attempt.participantPos]
        .attempts[req.attempt.attemptPos],
        newAttempt
    )


    return course.save()
        .then(() => {
            return res.json({
                attempt: newAttempt
            });
        })
        .catch(err => {
            console.log(err);
            return res.status(err.status || 400)
                .json({
                    error: err
                })
        })
}

exports.finishAttempt = (req, res) => {
    let attempt = req.attempt.data;
    let exercise = req.exercise.data;
    attempt.endTime = new Date();


    //TODO calculate score - check correct answers in exercise tasks

    let { tasks } = exercise;
    let { answers } = attempt;
    let score = 0;

    for (let t = 0; t < tasks.length; t++){
        let task = tasks[t];
        switch (task.kind){
            case 'OneChoiceExercise': {
                if (answers[t].value === task.correctAnswer) {
                    score += task.score;
                }
                break;
            }
            case 'TextExercise': {
                if (task.correctAnswers.indexOf(answers[t].value) >= 0){
                    score += task.score;
                }
                break;
            }
            case 'MultipleChoiceExercise': {
                let cntCorrect = 0;
                for (let v of task.options){
                    let i1 = task.correctAnswers.indexOf(v.key) >= 0,
                        i2 = answers[t].values.indexOf(v.key) >= 0;

                    if (i1 ^ i2){
                        cntCorrect++;
                    }
                }

                if (!task.onlyFull){
                    score += task.score * (cntCorrect / task.options.length);
                } else {
                    if (cntCorrect === task.options.length){
                        score += task.score;
                    }
                }

                break;
            }
        }
    }

    attempt.score = score;

    let course = req.courseData;

    console.log('attempt for burhs', attempt);

    course.exercises[req.exercise.pos]
        .participants[req.attempt.participantPos]
        .attempts[req.attempt.attemptPos]
        = attempt;

    return course.save()
        .then(() => {
            return res.json({
                attempt: attempt
            });
        })
        .catch(err => {
            console.log(err);
            return res.status(err.status || 400)
                .json({
                    error: err
                })
        })
}

exports.newExerciseAttempt = async (req, res) => {
    let exercise = req.exercise.data;
    let { participants } = exercise;
    let participantPos = -1;

    if (!exercise.available){
        return res.status(401).json({
            error: {
                status: 401,
                message: 'You are not authorized to create a new attempt - the exercise is not available'
            }
        })
    }

    for (let p = 0; p < participants.length; p++) {
        if (participants[p].user.equals(req.auth._id)){
            participantPos = p;
        }
    }

    if (participantPos < 0){
        exercise.participants.push({
            user: req.auth._id,
            attempts: []
        })

        participantPos = exercise.participants.length - 1;
    }

    let newAttempt = await new ExerciseAttempt;
    newAttempt.answers = [];
    newAttempt.score = null;

    for (let i = 0; i < exercise.tasks.length; i++){
        let task = exercise.tasks[i];
        switch (task.kind){
            case 'MultipleChoiceExercise':{
                newAttempt.answers.push({
                    kind: 'MultipleAttemptAnswer',
                    values: []
                })
                break;
            }
            default: {
                newAttempt.answers.push({
                    kind: 'OneAttemptAnswer',
                    value: null
                })
            }
        }

        newAttempt.answers[i].taskRef = task._id;
    }

    exercise.participants[participantPos].attempts.push(newAttempt);

    let course = req.courseData;
    course.exercises[req.exercise.pos] = exercise;
    return course.save()
        .then((result) => {
            let len = exercise.participants[participantPos].attempts.length
            return res.json({
                newAttempt:
                    result
                        .exercises[req.exercise.pos]
                        .participants[participantPos]
                        .attempts[len - 1]
            });
        })
        .catch(err => {
            console.log(err);
            return res.status(err.status || 400)
                .json({
                    error: err
                })
        })
}