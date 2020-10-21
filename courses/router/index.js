let courseRouter = require('./course');
let miscRouter = require('./courses');
const {courseById} = require("../controllers");

let router = require('express').Router();

router.use('/course/:courseId', courseRouter);
router.use('/courses', miscRouter);

router.param('courseId', courseById);
module.exports = router;