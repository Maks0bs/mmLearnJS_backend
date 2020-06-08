let { 
	ForumTopicPost
} = require('../model')
let _ = require('lodash');
let mongoose = require('mongoose');

exports.topicById = (req, res, next, topicId) => {
	let len = 0;
	if (req.entry.data.content.topics){
		len = req.entry.data.content.topics.length;
	}

	for (let i = 0; i < len; i++){
		let topic = req.entry.data.content.topics[i];
		if (topic._id == topicId){
			req.topic = {
				data: topic,
				pos: i
			}
			return next();
		}
	}

	return res.status(404).json({
		error: {
			status: 404,
			message: "No topic with this id was found"
		}
	})
}

exports.postById = (req, res, next, postId) => {
	let len = 0;
	if (req.topic.data.posts){
		len = req.topic.data.posts.length;
	}

	for (let i = 0; i < len; i++){
		let post = req.topic.data.posts[i];
		if (post._id == postId){
			req.post = {
				data: post,
				pos: i
			}
			return next();
		}
	}

	return res.status(404).json({
		error: {
			status: 404,
			message: "No post with this id was found"
		}
	})
}

// req.body = {
// 	name,
// 	initContent
// }
exports.createForumTopic = (req, res) => {
	let entry = req.entry.data;
	console.log('entry', entry);
	if (req.userCourseStatus === 'student' && entry.content.teachersOnly){
		return res.status(401).json({
			error: {
				status: 401,
				message: 'only teachers can create topics in this forum'
			}
		})
	}
	let newTopic = {
		name: req.body.name,
		creator: req.auth,
		posts: [
			{
				creator: req.auth,
				content: req.body.initContent,
				answers: []
			}
		]
	};
	entry.content.topics.push(newTopic);
	let course = req.courseData;
	course.sections[req.entry.section].entries[req.entry.pos] = entry;
	course.save()
	.then(result => {
		return res.json(result);
	})
	.catch(err => {
		console.log(err);
		return res.status(err.status || 400)
			.json({
				error: err
			})
	})
}

exports.answerTopicPost = async (req, res) => {
	let entry = req.entry.data;
	if (req.userCourseStatus === 'student' && entry.content.teachersOnly){
		return res.status(401).json({
			error: {
				status: 401,
				message: 'only teachers can create topics in this forum'
			}
		})
	}
	let rawPost = {
		creator: req.auth,
		content: req.body.content,
		answers: []
	};
	let post = await new ForumTopicPost(rawPost);
	let course = req.courseData;
	course.sections[req.entry.section].entries[req.entry.pos]
		.content.topics[req.topic.pos].posts.push(post);
	course.sections[req.entry.section].entries[req.entry.pos]
		.content.topics[req.topic.pos].posts[req.post.pos].answers
		.push(mongoose.mongo.ObjectId(post._id));
	course.save()
	.then(result => {
		return res.json(result);
	})
	.catch(err => {
		console.log(err);
		return res.status(err.status || 400)
			.json({
				error: err
			})
	})
}

exports.deleteTopicPost = (req, res) => {
	let course = req.courseData;
	let post = req.post.data;
	if (req.userCourseStatus === 'teacher' || req.userCourseStatus === 'creator' 
	){
		/*course.sections[req.entry.section].entries[req.entry.pos].content
			.topics[req.topic.pos].posts[req.post.pos] = undefined;*/

		let postsMap = {};
		for (let post of course.sections[req.entry.section]
			.entries[req.entry.pos].content
			.topics[req.topic.pos].posts
		){
			postsMap[post._id] = post;
		}

		let q = [req.post.data], head = 0, postsToDeleteMap = {}, 
			postsToDelete = [req.post.data._id];
		postsToDeleteMap[post._id] = 1;

		while(head !== q.length){
			let cur = q[head];
			head++;//pop
			for (let answerId of cur.answers){
				if (!postsToDeleteMap[answerId]){
					q.push(postsMap[answerId]);
					postsToDeleteMap[answerId] = 1;
				}
			}
		}

		let newPosts = [];

		//TODO delete references to the deleted post in the parent post

		for (let i = 0; i < req.topic.data.posts.length; i++){
			let post = course.sections[req.entry.section].entries[req.entry.pos]
			.content.topics[req.topic.pos].posts[i];
			if (!postsToDeleteMap[post._id]){
				newPosts.push(course.sections[req.entry.section].entries[req.entry.pos]
					.content.topics[req.topic.pos].posts[i]
				);
			}
			
		}

		course.sections[req.entry.section].entries[req.entry.pos]
			.content.topics[req.topic.pos].posts = newPosts;

	} else if (req.userCourseStatus === 'student'){
		if (!req.post.data.creator.equals(req.auth._id)){
			return res.status(401).json({
				error: {
					status: 401,
					message: 'You are not the creator of the post'
				}
			})
		} else {
			if (req.post.data.answers && req.post.data.answers.length > 0){
				return res.status(403).json({
					error: {
						status: 403,
						message: 'You can only remove posts without answers!'
					}
				})
			} else {
				let newPosts = [];

				//TODO delete references to the deleted post in the parent post
				for (let i = 0; i < req.topic.data.posts.length; i++){
					let post = req.topic.data.posts[i];
					if (post._id !== req.post._id){
						newPosts.push(post);
					}
					
				}

				course.sections[req.entry.section].entries[req.entry.pos]
					.content.topics[req.topic.pos].posts = newPosts;
			}
		}
	} else if (req.userCourseStatus === 'not enrolled'){
		return res.status(401).json({
			error: {
				status: 401,
				message: 'You are not authorized to delete posts'
			}
		})
	}

	course.save()
	.then((result) => {
		return res.json({
			message: 'forum post(s) deleted successfully'
		})
	})
	.catch(err => {
		console.log(err);
		return res.status(err.status || 400)
			.json({
				error: err
			})
	}) 
}