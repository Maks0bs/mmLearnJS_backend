exports.courseMethods = {
    /**
     * @function checkPassword
     * @description returns true if the given password in plain text is the correct one
     * for the given course and course has a password (this password was originally hashed and saved)
     * @param {string} plain
     * @return {boolean}
     *
     * @memberOf models.Course
     */
    checkPassword: function(plain){
        return this.hasPassword &&
            (this.encryptPassword(plain) === this.hashed_password)
    },
    /**
     * @description returns a hashed password, see {@link crypto}. The key for hashing the salt,
     * which is saved in the course document.
     * @param {string} password
     * @return {string}
     * @memberOf models.Course
     */
    encryptPassword: function(password){
        // we return "" because errors are caught inside this func.
        // if we try to set the wrongly encrypted password, it would cause a mongoose error
        if ((typeof password !== 'string') || !password) return "";
        try {
            return crypto.createHmac('sha1', this.salt)
                .update(password)
                .digest('hex');
        } catch(err){
            console.log(err);
            return '';
        }
    }
}