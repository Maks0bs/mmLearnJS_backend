let {
    Course
} = require('../model')
let User = require('../../users/model');

exports.subscribe = (req, res) => {
    let course = req.courseData;
    if (course.subscribers.includes(req.auth._id)){
        return res.status(400).json({
            error: {
                status: 400,
                message: 'You are already subscribed to the course'
            }
        })
    }
    course.subscribers.push(req.auth);
    course.save()
        .then(c => {
            return User.findByIdAndUpdate(
                req.auth._id,
                {
                    $push: {
                        subscribedCourses: {
                            lastVisited: Date.now(),
                            course: c
                        }
                    }
                }
            )
        })
        .then(() => {
            return res.json({
                message: 'You have subscribed to updates in this course'
            })
        })
        .catch(err => {
            console.log(err);
            return res.status(err.status || 400)
                .json({
                    error: err
                })
        })
}

exports.unsubscribe = (req, res) => {
    let course = req.courseData;
    let test = false;
    for (let i = 0; i < course.subscribers.length; i++){
        if (course.subscribers[i].equals(req.auth._id)){
            course.subscribers.splice(i, 1);
            test = true;
            break;
        }
    }

    if (!test){
        return res.status(400).json({
            error: {
                status: 400,
                message: 'You are not subscribed to the course, therefore you can\'t unsubscribe'
            }
        })
    }

    course.save()
        .then(c => {
            return User.findByIdAndUpdate(
                req.auth._id,
                {
                    $pull: {
                        subscribedCourses: {
                            course: c
                        }
                    }
                }
            )
        })
        .then(() => {
            return res.json({
                message: 'You have unsubscribed from updates in this course'
            })
        })
        .catch(err => {
            console.log(err);
            return res.status(err.status || 400)
                .json({
                    error: err
                })
        })
}

exports.viewCourse = (req, res) => {
    let user = req.auth;
    let courseId = req.courseData._id;

    for (let i = 0; i < user.subscribedCourses.length; i++){
        let cur = user.subscribedCourses[i].course;
        if (courseId.equals(cur)){
            user.subscribedCourses[i].lastVisited = new Date();
        }
    }

    user.save()
        .then(() => {
            return res.json({
                message: 'course has been viewed'
            })
        })
        .catch(err => {
            console.log(err);
            res.status(err.status || 400)
                .json({
                    error: err
                })
        })
}