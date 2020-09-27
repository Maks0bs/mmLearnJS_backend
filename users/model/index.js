let mongoose = require('mongoose');
let { v1: uuidv1 } = require('uuid');
let { ObjectId } = mongoose.Schema;

/**
 * @memberOf models
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - _id
 *         - name
 *         - email
 *         - hashed_password
 *         - _password
 *         - salt
 *         - role
 *       properties:
 *         _id:
 *           $ref: '#/components/schemas/ObjectID'
 *         name:
 *           type: string
 *           example: nickname
 *         email:
 *           type: string
 *           format: email
 *           example: example@email.com
 *         hashed_password:
 *           type: string
 *         _password:
 *           type: string
 *           pattern: '\d'
 *           minLength: 6
 *           description: >
 *             this property is not saved in the database.
 *             the password gets hashed on the server and
 *             all operations are only done with the hashed password.
 *             The original (plain text) password should be
 *             at least 6 characters long and should contain a number
 *           example: passw1
 *         activated:
 *           type: boolean
 *         salt:
 *           readOnly: true
 *           type: string
 *           description: >
 *             the key for hashing the password. It is saved
 *             in the database and it is absolutely safe to do so
 *         created:
 *           $ref: '#/components/schemas/Date'
 *           default: Date.now
 *           description: the date when this user was created
 *         updated:
 *           $ref: '#/components/schemas/Date'
 *           description: the date when this user was updated / edited for the last time
 *         about:
 *           type: string
 *           default: '""'
 *         role:
 *           type: string
 *           enum: [student, teacher, admin]
 *           default: student
 *         enrolledCourses:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/Course'
 *               - $ref: '#/components/schemas/ObjectID'
 *         teacherCourses:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/Course'
 *               - $ref: '#/components/schemas/ObjectID'
 *         subscribedCourses:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               course:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/Course'
 *                   - $ref: '#/components/schemas/ObjectID'
 *               lastVisited:
 *                 $ref: '#/components/schemas/Date'
 *         photo:
 *           oneOf:
 *             - type: 'null'
 *             - $ref: '#/components/schemas/Upload.File'
 *             - $ref: '#/components/schemas/ObjectID'
 *         hiddenFields:
 *           type: array
 *           items:
 *             type: string
 *         notifications:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               type:
 *                 type: string
 *               title:
 *                 type: string
 *               text:
 *                 type: string
 *               created:
 *                 $ref: '#/components/schemas/Date'
 *                 default: Date.now
 */
let userSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    email: {
        type: String,
        trim: true,
        validate: {
            validator: function(email){
                return /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
                    .test(email);
            },
            message: props => (
                `${props.value} is not a valid email.` +
                `Follow the common pattern, specified in RFC 5322`
            )
        },
        required: [true, 'Email is required']
    },
    hashed_password: {
        type: String,
        required: [true, 'Password is required'],
        validate: {
            validator: function() {
                if ((typeof this._password) !== 'string') return false;
                let isLongEnough = this._password.length >= 6;
                let containsDigit = /\d/.test(this._password);
                return isLongEnough && containsDigit;
            },
            message:
                'The password should be at least 6 characters long ' +
                'and should contain a number'
        }
    },
    salt: {
        type: String,
        required: [true, 'Special salt for password is required']
    },
    created: {
        type: Date,
        default: Date.now
    },
    updated: Date,
    about: {
        type: String,
        trim: true,
        default: ''
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: "student",
        required: [true, 'User role is required']
    },
    activated: {
        type: Boolean,
        default: false
    },
    enrolledCourses: [
        {
            type: ObjectId,
            ref: 'Course'
        }
    ],
    subscribedCourses: [
        {
            course: {
                type: ObjectId,
                ref: 'Course',
                required: [
                    true,
                    'subscribed courses should have ' +
                    'a reference to the actual course'
                ]
            },
            lastVisited: {
                type: Date,
                required: [
                    true,
                    `subscribed courses should have data about` +
                    `the user's last visit to the course`
                ]
            }
        }
    ],
    teacherCourses: [
        {
            type: ObjectId,
            ref: 'Course'
        }
    ],
    photo: {
        type: ObjectId,
        ref: 'Uploads.File'
    },
    hiddenFields: [
        String
    ],
    notifications: [
        {
            //TODO add discriminators for different types of notifications
            type: {
                type: String,
            },
            title: {
                type: String,
                required: [true, 'title is required to create a notification']
            },
            text: String,
            created: {
                type: Date,
                default: Date.now
            }
        }
    ]
});

userSchema
    .virtual('password')
    .set(function(password){
        this._password = password;
        this.salt = uuidv1();
        this.hashed_password = this.encryptPassword(password);
    })
    .get(function() {
        return this._password;
    })

userSchema.statics = require('./statics');
userSchema.methods = require('./methods');

const User = mongoose.model('User', userSchema);
module.exports = User;