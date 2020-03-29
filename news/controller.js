let NewsEntry = require('./model')

exports.getNews = (req, res) => {
	res.json([
		{
			message: 'test successful'
		}
	])
}

exports.createNewsEntry = (req, res) => {
	let newEntry = new NewsEntry(req.body);
	newEntry.save((err, result) => {
		if (err){
			return res.status(400).json({
				error: err
			})
		}
		res.json(result);
	});
}