let {
	getNews,
	createNewsEntry
} = require('./controller');
let router = require('express').Router()

router.get('/', getNews);
router.post('/create', createNewsEntry);

module.exports = router;