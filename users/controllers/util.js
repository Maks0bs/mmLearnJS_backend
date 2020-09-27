exports.isCourseTeacher = (req, res, next) => {
    if (req.auth.role !== 'teacher'){
        return res.status(401)
            .json({
                message: 'You are not a teacher'
            })
    }

    return next();
}

exports.userInCourse = (req, res, next) => {
    let course = req.courseData;
    if (course.creator._id.equals(req.auth._id)){
        req.userCourseStatus = 'creator';
        return next();
    }
    for (let i of course.teachers){
        if (i._id.equals(req.auth._id)){
            req.userCourseStatus = 'teacher';
            return next();
        }
    }
    for (let i of course.students){
        if (i._id.equals(req.auth._id)){
            req.userCourseStatus = 'student';
            return next();
        }
    }

    req.userCourseStatus = 'not enrolled';

    return res.status(401).json({
        error: {
            status: 401,
            message: `you don't have access to this course`
        }
    })


}

exports.teacherInCourse = (req, res, next) => {
    if (!req.courseData.teachers){
        return res.status(401).json({
            message: 'No teachers in this course'
        })
    }

    let check = false;

    for (let i of req.courseData.teachers){
        if (i.equals(req.auth._id)){
            check = true;
            break;
        }
    }

    if (!check){
        return res.status(401).json({
            message: 'You are not authorized to perform this action'
        })
    }

    return next();
}

exports.isCourseCreator = (req, res, next) => {
    if (!req.courseData.creator._id.equals(req.auth._id)){
        res.status(401).json({
            error: {
                status: 401,
                message: 'you are not the creator of the course'
            }
        })
    }
    else{
        next();
    }
}