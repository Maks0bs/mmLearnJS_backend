/**
 * @description returns the status of the user in relation to
 * the provided exercise. Possible statuses: <br/> 1) the user is a student
 * in the course to which the exercise has a reference and this
 * student can participate in the exercise (make an attempt); <br/> 2) The user
 * is a teacher in the course to which the exercise has a reference
 * and therefore is allowed to edit the given exercise view its
 * tasks without limitations
 * @param {models.Exercise} exercise
 * @param {models.User} user
 * @param {Object.<string, boolean>} [memberSet] - optional param with
 * already provided set of courses in a form of dictionary which
 * assigns the course ID to `true` if the user is a member at the
 * course with the given ID.
 * @param {Object.<string, boolean>} [teacherSet] - optional param with
 * already provided set of courses in a form of dictionary which
 * assigns the course ID to `true` if the user is a teacher at the
 * course with the given ID.
 * @return {string|null} - `"student"` or `"teacher"` or `null`
 * are possible return values
 */
const getExerciseUserStatus = (exercise, user, memberSet, teacherSet) => {
    let memberCoursesSet = {}, teacherCoursesSet = {};
    if (!memberSet && Array.isArray(user.enrolledCourses)){
        user.enrolledCourses.forEach(c => memberCoursesSet[c] = true);
    } else {
        memberCoursesSet = memberSet || {};
    }
    if (!teacherSet && Array.isArray(user.teacherCourses)){
        user.teacherCourses.forEach(c => {
            memberCoursesSet[c] = true
            teacherCoursesSet[c] = true
        });
    } else {
        teacherCoursesSet = teacherSet || {};
    }
    let isMember = exercise.courseRefs.findIndex(c => memberCoursesSet[c]) >= 0,
        isTeacher = exercise.courseRefs.findIndex(c => teacherCoursesSet[c]) >= 0;
    if (!isMember && !isTeacher){
        return null;
    } else if (isMember && !isTeacher){
        return 'student';
    } else if (isMember && isTeacher){
        return 'teacher';
    }
}
exports.getExerciseUserStatus = getExerciseUserStatus;