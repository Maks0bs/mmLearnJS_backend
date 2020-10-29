exports.exerciseMethods = {
    /**
     * @param {Object} options
     * @param {string|ObjectId} options.userId - required option! The user
     * who performs the operation about deleting entries. Required
     * to check if this user has enough authorization
     * @return {Promise} - the promise that gets resolved
     * if all object that this entry references were
     * deleted successfully, it gets rejected if there
     * was a problem deleting some object. Please note
     * that this promise does not handle errors
     * automatically, they should be caught manually
     */
    delete: function (options){
        console.log('delete exercise');
        return Promise.resolve(true);
    }
}