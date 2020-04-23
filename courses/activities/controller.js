let { Activity, Test, Forum } = require('./model')

exports.createActivity = (req, res) => {
	let forum = new Forum(req.body);
	forum.save()
	.then(forum => {
		res.json(forum);
	})
	.catch(err => {
        console.log(err);
        res.status(err.status || 400)
            .json({
                error: err
            })
    })
}