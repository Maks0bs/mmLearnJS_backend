let crypto = require('crypto');

module.exports = {
    /**
     * returns true if the given password in plain text is the correct one
     * for the given user (this password was originally hashed and saved)
     * @param {string} plain
     * @return {boolean}
     *
     * @memberOf models.User
     */
    checkCredentials: function(plain){
        return this.encryptPassword(plain) === this.hashed_password
    },
    /**
     * hides the fields, specified in the array of user's hidden fields.
     * Note: don't perform call this method if you haven't populated the user
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
     * returns a hashed password, see {@link crypto}
     * @param password
     * @return {string}
     * @memberOf User
     *
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
}