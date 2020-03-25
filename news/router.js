let router = require('express').Router()
// maybe change to 

router.get('/', (req, res) => {
	res.json([
		{
			message: 'test successful'
		}
	])
})

module.exports = router;