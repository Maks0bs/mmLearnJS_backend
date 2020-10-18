let coursesRouter = require('./courses');
let exercisesRouter = require('./exercises');
let forumsRouter = require('./forums');
const {exerciseById} = require("../controllers/exercises");
const {forumById} = require("../controllers/forums");
const {courseById} = require("../controllers");

let router = require('express').Router();

router.use('/course/:courseId', coursesRouter);
router.use('/exercise/:exerciseId', exercisesRouter);
router.use('/forum/:exerciseId', forumsRouter);

router.param('courseId', courseById);
router.param('forumId', forumById);
router.param('exerciseId', exerciseById);

module.exports = router;