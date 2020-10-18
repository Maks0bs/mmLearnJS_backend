let coursesRouter = require('./course');
let miscRouter = require('./courses');
const {courseById} = require("../controllers");

let router = require('express').Router();

router.use('/course/:courseId', coursesRouter);
router.use('/courses', miscRouter);

router.param('courseId', courseById);
module.exports = router;