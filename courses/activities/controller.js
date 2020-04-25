let { Activity, Test, Forum, Bruh } = require('./model')
let mongoose = require('mongoose');

let Game = mongoose.model('Game', new mongoose.Schema({
	f1: String,
	f2: String
}))

exports.createActivity = (req, res) => {
	

	let tg = new Game(req.body);
	console.log('game before save', tg);
	tg.save()
	.then((game) => {
		console.log('game after save', game);
		return res.json(game);
	})
	.catch(err => {
		console.log(err);
		return res.status(err.status || 400)
			.json({
				error: err
			})
	})
}