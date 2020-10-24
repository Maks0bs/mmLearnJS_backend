let mongoose = require('mongoose');
let { v1: uuidv1 } = require('uuid');
let { ObjectId } = mongoose.Schema;

const HIDEABLE_FIELDS = [
    'email', 'created', 'updated', 'about', 'role', 'enrolledCourses',
    'teacherCourses', 'photo'
]
/**
 * @class User
 * @memberOf models
 * @name User
 * @type Class
 * @property {ObjectId} _id
 * @property {string} name
 * @property {string} email
 * @property {boolean} activated
 * @property {string} hashed_password
 * @property {string} salt
 * @property {?string} [about]
 * @property {string} role
 * @property {BSONDate} created
 * @property {BSONDate} updated
 * @property {ObjectId[]|models.Course[]} enrolledCourses
 * @property {ObjectId[]|models.Course[]} [teacherCourses]
 * @property {{course: ObjectId|models.Course, lastVisited: BSONDate}[]} subscribedCourses
 * @property {?ObjectId|?models.GridFSFile} photo
 * @property {string[]} hiddenFields
 * @property {UserNotification[]} notifications
 * @property {function(): undefined} hideFields see {@link models.User.hideFields}
 * @property {function(string): boolean} checkCredentials see {@link models.User.checkCredentials}
 * @property {function(string): string} encryptPassword see {@link models.User.encryptPassword}
 * @property {function(UserNotification): undefined} addNotification see {@link models.User.addNotification}
 */
/**
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
 *           $ref: '#/components/schemas/ObjectId'
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
 *           description: the date when this users was created
 *         updated:
 *           $ref: '#/components/schemas/Date'
 *           description: the date when this users was updated / edited for the last time
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
 *               - $ref: '#/components/schemas/ObjectId'
 *         teacherCourses:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/Course'
 *               - $ref: '#/components/schemas/ObjectId'
 *         subscribedCourses:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               course:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/Course'
 *                   - $ref: '#/components/schemas/ObjectId'
 *               lastVisited:
 *                 $ref: '#/components/schemas/Date'
 *         photo:
 *           oneOf:
 *             - type: 'null'
 *             - $ref: '#/components/schemas/File'
 *             - $ref: '#/components/schemas/ObjectId'
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
        ref: 'Uploads.File',
        default: null
    },
    hiddenFields: [
        {
            type: String,
            validate: {
                validator: function(field){
                    return HIDEABLE_FIELDS.includes(field);
                },
                message: props => `Cannot hide the field "${props.value}"`
            }
        }
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
}, {autoCreate: true});

// when setting the password, the validation occurs right away (before saving document to database)
// Because of that, always wrap the operation, where you try to set the password in a try...catch block
// to catch error, which are thrown in the setter for password if it is not acceptable.
userSchema
    .virtual('password')
    .set(function(password){
        if ((typeof password) !== 'string'){
            throw new Error('Password should be a string');
        }
        let isLongEnough = password.length >= 6;
        let containsDigit = /\d/.test(password);
        if (!(isLongEnough && containsDigit)){
            throw new Error(
                'Password should be at least 6 characters long and should contain a digit'
            )
        }
        this._password = password;
        // we should generate a new salt each time a password gets reset
        this.salt = uuidv1();
        this.hashed_password = this.encryptPassword(password);
    })
    .get(function() {
        return this._password;
    })

userSchema.methods = require('./methods');

const User = mongoose.model('User', userSchema);
module.exports = User;