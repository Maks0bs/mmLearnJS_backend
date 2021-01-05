let {ForumTopicPost} = require('../model/ForumTopicPost')
const {handleError} = require("../../helpers");

/**
 * @class controllers.forum
 */
/**
 * @type function
 * @description returns the forum with hidden
 * topics/posts creators data, which was
 * found via {@link controllers.forum.forumById forumById}
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Forum} req.forum
 * @memberOf controllers.forum
 */
const getForumById = (req, res) => {
	let { forum } = req;
	return res.json(forum);
}
exports.getForumById = getForumById;


/**
 * @type function
 * @throws 401
 * @description creates a new topic in the
 * forum with the given id.
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Forum} req.forum
 * @param {Object} req.body
 * @param {string} req.body.name
 * @param {string} req.body.content
 * @param {models.User} req.auth
 * @memberOf controllers.forum
 */
const createForumTopic = (req, res) => {
	let {forum} = req;
	let newTopic = {
		name: req.body.name,
		creator: req.auth,
		posts: [
			{
				creator: req.auth,
				content: req.body.content,
				answers: []
			}
		]
	};
	forum.topics.push(newTopic);
	return forum.save()
		.then(result => res.json(result) )
		.catch(err => handleError(err, res))
}

exports.createForumTopic = createForumTopic;

/**
 * @type function
 * @throws 401
 * @description creates a new post in the specified forum
 * which is the answer to the post under `req.post`
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Forum} req.forum
 * @param {ForumTopicPost} req.post
 * @param {models.Forum.ForumTopic} req.topic
 * @param {Object} req.body
 * @param {string} req.body.content
 * @param {models.User} req.auth
 * @memberOf controllers.forum
 */
const answerTopicPost = (req, res) => {
	let rawPost = {
		creator: req.auth,
		content: req.body.content,
		answers: []
	};
	let post = new ForumTopicPost(rawPost);
	let {forum} = req;
	forum.topics[req.topic.pos].posts.push(post);
	forum.topics[req.topic.pos].posts[req.post.pos].answers.push(post._id);
	return forum.save()
		.then(result => res.json(result) )
		.catch(err => handleError(err, res))
}
exports.answerTopicPost = answerTopicPost;

/**
 * @type function
 * @throws 401
 * @description deletes the post with the specified ID.
 * If this post has any answers and the authenticated
 * user is a teacher at a course, to which the given
 * forum has a reference, then also delete the
 * children-answers of this post.
 * @param {e.Request} req
 * @param {e.Response} res
 * @param {models.Forum} req.forum
 * @param {ForumTopicPost} req.post
 * @param {models.Forum.ForumTopic} req.topic
 * @param {boolean} req.isAuthorizedForumTeacher
 * @param {models.User} req.auth
 * @memberOf controllers.forum
 */
const deleteTopicPost = (req, res) => {
	let post = req.post.data, topic = req.topic.data, {forum} = req, newPosts = [];
	if (req.isAuthorizedForumTeacher){
		let postsMap = {};
		topic.posts.forEach(p => postsMap[p._id] = p);
		let queue = [post], head = 0, postsToDeleteMap = {[post._id]: true};
		// Use BFS to iterate through all nested answers and delete them
		while(head !== queue.length){
			let cur = queue[head];
			// just increment head to avoid calling Array.shift(), which is very slow
			head++;
			if (!cur || !Array.isArray(cur.answers)) continue;
			for (let answerId of cur.answers){
				if (!postsToDeleteMap[answerId]){
					// add a yet unvisited vertex to the queue to
					// iterate through its neighbours afterwards
					queue.push(postsMap[answerId]);
					postsToDeleteMap[answerId] = true;
				}
			}
		}
		// only undeleted posts are left in the topic
		newPosts = topic.posts.filter(p => !postsToDeleteMap[p._id])
	} else {
		if (!post.creator._id.equals(req.auth._id)){
			return res.status(401).json({
				error: {status: 401, message: 'You are not the creator of the POST'}
			})
		} else {
			if (Array.isArray(post.answers) && post.answers.length > 0){
				return res.status(403).json({
					error: {
						status: 403,
						message: 'You can only remove posts without answers!'
					}
				})
			} else {
				newPosts = topic.posts.filter(p => !p._id.equals(post._id));
			}
		}
	}
	if (newPosts.length === 0){
		//remove topic if no posts are left there
		forum.topics.splice(req.topic.pos, 1);
	} else {
		let newPostsSet = {};
		newPosts.forEach(p => newPostsSet[p._id] = true);
		newPosts.forEach((p, i) => {
			newPosts[i].answers = p.answers.filter(a => newPostsSet[a]);
		})
		forum.topics[req.topic.pos].posts = [];
		forum.topics[req.topic.pos].posts.push(...newPosts);
	}
	return forum.save()
		.then(result => res.json(result))
		.catch(err => handleError(err, res))
}
exports.deleteTopicPost = deleteTopicPost;