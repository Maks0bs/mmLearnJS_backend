exports.exerciseMethods = {
    /**
     * @param {Object} options
     * @param {string|ObjectId} options.userId - required option! The user
     * who performs the operation about deleting entries. Required
     * to check if this user has enough authorization
     * @return {Promise} - the promise that gets resolved
     * if all object that exercise and its references were
     * deleted successfully, it gets rejected if there
     * was a problem deleting some object. Please note
     * that this promise does not handle errors
     * automatically, they should be caught manually
     */
    delete: function (options){
        const Exercise = require('./index');
        const {ExerciseTask} = require('./ExerciseTask');
        const {ExerciseAttempt} = require('./ExerciseAttempt');
        let exerciseRef = this;
        return Exercise.findById(this._id)
            .populate('courseRefs', ['_id', 'name', 'teachers', 'students'])
            .populate('tasks')
            .populate({
                path: 'participants',
                populate: {path: 'attempts'}
            })
            .then(exercise => {
                let isAuthorized = false, tasksToDelete = [],
                    attemptsToDelete = [], promises = []
                let criteria = u => u.toString() === options.userId.toString();
                for (let c of exercise.courseRefs){
                    isAuthorized = c.teachers.findIndex(criteria) >= 0;
                    if (isAuthorized) break;
                }
                if (!isAuthorized) throw {
                    message: 'The authenticated user is not authorized ' +
                        'to remove this exercise and its components'
                }
                exercise.tasks.forEach(t => {
                    let exerciseRefIndex = t.exerciseRefs
                        .findIndex(e => e.equals(exercise._id))
                    if (exerciseRefIndex >= 0){
                        t.exerciseRefs.splice(exerciseRefIndex);
                        if (t.exerciseRefs.length === 0){
                            tasksToDelete.push(t._id)
                        } else {
                            promises.push(t.save())
                        }
                    }
                })
                promises.push(ExerciseTask.deleteMany({_id: { $in: tasksToDelete}}))
                exercise.participants
                    .forEach(p => p.attempts.forEach(a => attemptsToDelete.push(a._id)))
                promises.push(ExerciseAttempt.deleteMany({_id: {$in: attemptsToDelete}}))
                return Promise.all(promises);
            })
            .then(() => Exercise.deleteOne({_id: exerciseRef._id}))
    }
}