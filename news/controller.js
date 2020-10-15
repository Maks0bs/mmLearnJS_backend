let NewsEntry = require('./model')

exports.getNews = (req, res) => {
	//Fake delay for testing async actions
	setTimeout(() => {
		res.json([
			{message: 'First release! YAY!'},
		])
	}, 500)

}

exports.createNewsEntry = (req, res) => {
	let newEntry = new NewsEntry(req.body);
	newEntry.save((err, result) => {
		if (err){
			return res.status(400).json({
				error: err
			})
		}
		res.json({
			result
		});
	});
}