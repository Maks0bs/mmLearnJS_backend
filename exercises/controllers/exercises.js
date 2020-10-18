let { ExerciseAttempt } = require('../model');
let { assign } = require('lodash');
let User = require('../../users/model')

exports.exerciseById = (req, res, next, id) => {
    let { exercises } = req.courseData;
    for (let e = 0; e < exercises.length; e++){
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
    let usersToPopulate = [], usersToPopulateSet = {}
    let { participants } = exercise;
    if (req.userCourseStatus === 'student'){
        exercise.participants = undefined;
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

        if (!usersToPopulateSet[p.user._id]){
            usersToPopulateSet[p.user._id] = 1;
            usersToPopulate.push(p.user._id);
        }
    }

    if (!(hasActiveAttempt && exercise.available)){
        //Don't send tasks data if users is not currently doing the exercise or if the exercise is not available
        exercise.tasks = undefined;
    } else {

        //Otherwise remove correct answers from task data
        for (let t = 0; t < exercise.tasks.length; t++){
            exercise.tasks[t].correctAnswer = undefined;
            exercise.tasks[t].correctAnswers = undefined;
        }
    }

    if (!exercise.participants){
        return res.json(exercise);
    }

    return User.find({
        _id: {
            $in: usersToPopulate
        }
    })
        .then(users => {
            for (let user of users){
                user.hideFields();
                usersToPopulateSet[user._id] = user;
            }

            for (let j = 0; j < exercise.participants.length; j++){
                exercise.participants[j].user = usersToPopulateSet[exercise.participants[j].user._id];
            }

            return res.json(exercise);
        })
        .catch(err => {
            console.log(err);
            res.status(err.status || 400)
                .json({
                    error: err
                })
        })


}


//TODO getGrades (for students)

//TODO getGrades (for teachers). Order: each users->exercise data, (not vice versa, not like stored in db)

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
                return b.startTime - a.startTime;
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

    if (oldAttempt.endTime && req.userCourseStatus === 'student'){
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

        newAnswers[i].score = oldAnswers[i].score;

        switch(newAnswers[i].kind){
            case 'MultipleChoiceTaskAttempt': {
                if (!newAnswers[i].values){
                    newAnswers[i].values = [];
                }
                break;
            }
            case 'TextTaskAttempt':
            case 'OneChoiceTaskAttempt': {
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
        let taskScore = 0;
        switch (task.kind){
            case 'OneChoiceTask': {
                if (answers[t].value === task.correctAnswer) {
                    score += task.score;
                    taskScore += task.score;
                }
                break;
            }
            case 'TextTask': {
                if (task.correctAnswers.indexOf(answers[t].value) >= 0){
                    score += task.score;
                    taskScore += task.score;
                }
                break;
            }
            case 'MultipleChoiceTask': {
                let cntCorrect = 0;
                for (let v of task.options){
                    let i1 = task.correctAnswers.indexOf(v.key) >= 0,
                        i2 = answers[t].values.indexOf(v.key) >= 0;

                    if (!(i1 ^ i2)){
                        cntCorrect++;
                    }
                }

                if (!task.onlyFull){
                    taskScore += task.score * (cntCorrect / task.options.length);
                    score += taskScore;
                } else {
                    if (cntCorrect === task.options.length){
                        score += task.score;
                        taskScore += task.score;
                    }
                }

                break;
            }
        }

        attempt.answers[t].score = taskScore;
    }

    attempt.score = score;

    let course = req.courseData;

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
    let participantPos = -1, hasRunningAttempt = false;

    if (!exercise.available){
        return res.status(401).json({
            error: {
                status: 401,
                message: 'You are not authorized to create a new attempt - the exercise is not available'
            }
        })
    }

    if (!(req.userCourseStatus === 'student')){
        return res.status(401).json({
            error: {
                status: 401,
                message: 'Not authorized! Only students can do exercises'
            }
        })
    }

    for (let p = 0; p < participants.length; p++) {
        if (participants[p].user.equals(req.auth._id)){
            for (let a of participants[p].attempts){
                if (!a.endTime){
                    hasRunningAttempt = true;
                    break;
                }
            }
            participantPos = p;
        }
    }

    if (hasRunningAttempt){
        return res.status(401).json({
            error: {
                status: 401,
                message: 'You already have a running attempt on this course. ' +
                    'Finish it and then you will be able to start a new one'
            }
        })
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
    //newAttempt.score = null;

    for (let i = 0; i < exercise.tasks.length; i++){
        let task = exercise.tasks[i], curAns;
        switch (task.kind){
            case 'MultipleChoiceTask':{
                curAns = { kind: 'MultipleChoiceTaskAttempt', values: [] }
                break;
            }
            case 'OneChoiceTask':{
                curAns = { kind: 'OneChoiceTaskAttempt', value: null }
                break;
            }
            case 'TextTask': {
                curAns = { kind: 'TextTaskAttempt', value: null }
                break;
            }
        }
        newAttempt.answers.push(curAns);
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

exports.configureExerciseSummary = (req, res, next) => {
    let userIsTeacher = (req.userCourseStatus === 'teacher') || (req.userCourseStatus === 'creator')
    let param = req.params.summaryParam;
    if (param === 'all'){
        if (!userIsTeacher){
            res.status(401).json({
                error: {
                    status: 401,
                    message: 'Only teachers can view summary on all students'
                }
            })
        }
        req.exerciseSummaryFilter = 'all';
    } else {
        if (!(param == req.auth._id) && !userIsTeacher){
            res.status(401).json({
                error: {
                    status: 401,
                    message: 'Students can only view their own summary'
                }
            })
        }
        req.exerciseSummaryFilter = param;
    }
    return next();
}

exports.getExerciseSummary = (req, res) => {
    let course = req.courseData;
    let usersSet = {}, usersToPopulate = []

    if (req.exerciseSummaryFilter === 'all'){
        for (let e of course.exercises){
            for (let p of e.participants){
                // Add to the map of exercise participants
                usersSet[p.user._id] = true;
                usersToPopulate.push(p.user._id)
            }
        }
    } else {
        usersSet[req.exerciseSummaryFilter] = true;
        usersToPopulate = [req.exerciseSummaryFilter];
    }

    return User.find({
        _id: {
            $in: usersToPopulate
        }
    })
        .then((users) => {
            for (let u of users) {
                usersSet[u._id] = {
                    userId: u._id,
                    userName: u.name,
                    exercises: []
                }
            }


            // Has only one loop through all exercises for efficiency
            for (let e of course.exercises){
                for (let p of e.participants){
                    if (!usersSet[p.user._id]){
                        continue;
                    }
                    // remove answers in the final response,
                    // they are irrelevant for this request
                    for (let a = 0; a < p.attempts.length; a++){
                        p.attempts[a].answers = undefined;
                    }
                    usersSet[p.user._id].exercises.push({
                        id: e._id,
                        name: e.name,
                        attempts: p.attempts
                    })
                }
            }

            let result = [];

            for (let k of Object.keys(usersSet)){
                result.push(usersSet[k])
            }

            return res.json(result);
        })
        .catch(err => {
            console.log(err);
            return res.status(err.status || 400)
                .json({
                    error: err
                })
        })
}