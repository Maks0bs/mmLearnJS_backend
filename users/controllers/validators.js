let { body } = require('express-validator')
let userDataValidatorsSet = {}
/**
 * @param {string} [fieldName]
 * @return function - the validator for the users's name, which is located in the request body
 */
let userNameValidator = (fieldName) =>
    body(fieldName || "name", "Name is required").notEmpty().isString()
userDataValidatorsSet['name'] = userNameValidator;
exports.userNameValidator = userNameValidator;
/**
 * @param {string} [fieldName]
 * @return function - the validator for the users's email, which is located in the request body
 */
let userEmailValidator = (fieldName) => [
    body(fieldName || "email", "Email is required").notEmpty().isString(),
    body(fieldName || "email", "Email must be at least 4 characters long")
        .isLength({ min: 4, max: 2000}),
    body(fieldName || "email", "Email must follow the pattern example@example.example")
        .matches(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/)
]
userDataValidatorsSet['email'] = userEmailValidator
exports.userEmailValidator = userEmailValidator;
/**
 * @param {string} [fieldName]
 * @return function - the validator for the users's password, which is located in the request body
 */
let userPasswordValidator = (fieldName) => [
    body(fieldName || 'password', "Password is required").notEmpty().isString(),
    body(fieldName || 'password', "Password must contain at least 6 characters")
        .isLength({min : 6}),
    body(fieldName || 'password', "Password must contain a number").notEmpty()
        .matches(/\d/)
]
userDataValidatorsSet['password'] = userPasswordValidator;
exports.userPasswordValidator = userPasswordValidator;

/**
 * @param {Object.<string, string>} options - this param maps a {@link models.User} property to
 * its name in the body. For example, you want to set a new password
 * for the users, but this password is located under the `newPassword` property in the body.
 * In this case you should pass `{password: 'newPassword'}` under the options param.
 * Pass a falsy value if you don't need any conversion, described above
 * @param {...string} fields - the fields that should be validated for correctness.
 * See {@link models.User} for the list of all acceptable fields. Read-only fields
 * (like `_id` or `updated`) cannot be used here
 * @return function[] - returns the array with validator middleware to use in the router
 * See {@link https://express-validator.github.io/docs/index.html express-validator docs}
 */
exports.userDataValidator = (options, ...fields) => {
    let middleware = [], hasOptions = options && ((typeof options) === 'object')
    for (let f of fields){
        let fieldName = (hasOptions && options[f]) ? options[f] : f;
        let validator = userDataValidatorsSet[f](fieldName);
        if (Array.isArray(validator)){
            middleware.push(...validator);
        } else {
            middleware.push(validator);
        }
    }
    return middleware;
}