let NewsEntry = require('./model')

exports.getNews = (req, res) => {
	//Fake delay for tests
	setTimeout(() => {
		res.json([
			{message: `password for signing in as teacher : "testpass" `},
			{message: `TODO use github api to fetch readme for this project`}
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