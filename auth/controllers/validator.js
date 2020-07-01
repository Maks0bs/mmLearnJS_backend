let {
    body,
} = require('express-validator')

exports.userInfoValidator = [
    body("name", "Name is required").notEmpty(),
    body("email", "Email is required").notEmpty(),
    body("email", "Email must be at least 4 characters long")
        .isLength({
            min: 4,
            max: 2000
        }),
    body("email", "Email must follow the pattern example@example.example").matches(/.+@.+\..+/)
]

exports.passwordValidator = (field) => [
    body(field, "Password is required").notEmpty(),
    body(field, "Password must contain at least 6 characters")
        .isLength({min : 6}),
    body(field, "Password must contain a number").notEmpty()
        .matches(/\d/)
]

