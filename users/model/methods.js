let crypto = require('crypto');

module.exports = {
    /**
     * @function checkCredentials
     * @description returns true if the given password in plain text is the correct one
     * for the given users (this password was originally hashed and saved)
     * @param {string} plain
     * @return {boolean}
     *
     * @memberOf models.User
     */
    checkCredentials: function(plain){
        return this.encryptPassword(plain) === this.hashed_password
    },
    /**
     * @description hides the fields, specified in the array of users's hidden fields.
     * Note: don't perform call this method if you haven't populated the users
     * Object with the hidden fields prop or if this array is undefined.
     * @return undefined
     *
     * @memberOf models.User
     */
    hideFields: function(){
        for (let field of this.hiddenFields){
            this[field] = undefined;
        }
    },
    /**
     * @description returns a hashed password, see {@link crypto}. The key for hashing the salt,
     * which is saved in the users document.
     * @param {string} password
     * @return {string}
     * @memberOf models.User
     */
    encryptPassword: function(password){
        // we return "" because errors are caught inside this func.
        // if we try to set the wrongly encrypted password, it would cause a mongoose error
        if ((typeof password !== 'string') || !password) return "";
        try {
            return crypto.createHmac('sha1', this.salt)
                .update(password)
                .digest('hex');
        } catch (err){
            console.log(err);
            return "";
        }
    },
    /**
     * @param {UserNotification} notification
     * @return undefined
     * @memberOf models.User
     * @inner
     */
    addNotification: function(notification){
        if (!Array.isArray(this.notifications)){
            this.notifications = [];
        }
        this.notifications.push(notification);
    }
}

