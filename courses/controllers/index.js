let {
	Course
} = require('../model')
let User = require('../../users/model');
let _ = require('lodash');

exports.courseById = (req, res, next, id) => {
	Course.findOne({_id: id})
	.then(course => {
		if (!course) throw {
			status: 404,
			error: 'course not found'
		}
		return course;
	})
	.then(course => {

		req.courseData = course;
		next();
	})
	.catch(err => {
		console.log(err);
		return res.status(err.status || 400)
			.json({
				error: err
			})
	}) 
}

exports.createCourse = (req, res) => {
	console.log('create course body', req.body)
	let courseData = req.body;
	courseData.creator = req.auth;
	courseData.teachers = [req.auth];
	let course = new Course(courseData);
	User.findByIdAndUpdate(
		req.auth._id,
		{
			$push: {
				teacherCourses: course
			}
		},
		{new: true}
	)
	.populate('courses', '_id name')
	.then(result =>{
		return course.save();
	})
	.then(result => {
		return res.json({
			message: 'Your course has been created successfully',
			_id: course._id
		});
	})
	.catch(err => {
		console.log(err);
		return res.status(err.status || 400)
			.json({
				error: err
			})
	}) 

};

exports.getNewCourseData = (req, res, next) => {
	req.newCourseData = JSON.parse(req.body.newCourseData);
	req.filesPositions = req.body.filesPositions && JSON.parse(req.body.filesPositions);
	next();
}

exports.cleanupCourseData = (req, res, next) => {
	// compare entries in found course with the one in req body
	// if compare file ids in both lists
	// if some ids that are in mongo course are not present in req body - delete them
	let curFiles = {}, curEntries = {}, newEntries = [], deletedEntries = [];
	if (!req.newCourseData.sections){
		return next();
	}
	for (let section of req.courseData.sections){
		for (let i of section.entries){
			if (i.type === 'file'){
				curFiles[i.content.id] = 'none';
			}
			curEntries[i._id] = {
				none: true,
				data: {
					name: i.name,
					type: i.type,
					access: i.access
				}
			};
		}
	}

	for (let section of req.newCourseData.sections) {
		for (let i of section.entries){
			if (i.type === 'file'){
				curFiles[i.content.id] = 'exist'
			}
			if (i._id){
				curEntries[i._id] = 'exist';
			} else if (!(i.access === 'teachers')){
				newEntries.push({
					name: i.name,
					type: i.type
				})
			}
		}
	}

	let filesToDelete = [];
	for (let i of Object.keys(curFiles)) {
		if (curFiles[i] === 'none'){
			filesToDelete.push(i);
		}
	}
	for (let i of Object.keys(curEntries)){
		let cur = curEntries[i];
		if (cur !== 'exist' && cur.none && !(cur.data.access === 'teachers') ){
			deletedEntries.push({
				name: cur.data.name,
				type: cur.data.type
			})
		}
	}

	req.filesToDelete = filesToDelete;
	req.deletedEntries = deletedEntries;
	req.newEntries = newEntries;

	next();
}

// change update, add objectid handling
exports.updateCourse = async (req, res) => {
	let newCourseData = req.newCourseData;


	if (req.filesPositions){
		for (let i = 0; i < req.filesPositions.length; i++){
			let cur = req.filesPositions[i];
			newCourseData.sections[cur.section].entries[cur.entry].content = req.files[i]
		}
	}

	let len = 0;
	if (newCourseData.sections){
		len = newCourseData.sections.length
	}

	for (let section = 0; section < len; section++){
		for (let i = 0; i < newCourseData.sections[section].entries.length; i++){
			let cur = newCourseData.sections[section].entries[i];
			if (!cur.content.kind){
				switch(cur.type){
					case 'file': {
						newCourseData.sections[section].entries[i].content.kind = 'EntryFile'
						break;
					}
					case 'text': {
						newCourseData.sections[section].entries[i].content.kind = 'EntryText'
						break;
					}
					case 'forum': {
						newCourseData.sections[section].entries[i].content.kind = 'EntryForum'
						break;
					}
					default: {
						newCourseData.sections[section].entries[i].content.kind = 'EntryContent'
						break;
					}
				}
			}
		}
	}



	let course = req.courseData;

	let prevInfo = {
		name: req.courseData.name,
		about: req.courseData.about
	}
	course = _.extend(course, newCourseData);

	if (req.deletedEntries && req.deletedEntries.length > 0){
		course.updates.push({
			kind: 'UpdateDeletedEntries',
			deletedEntries: req.deletedEntries
		})
	}
	if (req.newEntries && req.newEntries.length > 0){
		course.updates.push({
			kind: 'UpdateNewEntries',
			newEntries: req.newEntries
		})
	}
	if (!_.isEqual(
		{name: course.name, about: course.about},
		prevInfo
	)
	){
		course.updates.push({
			kind: 'UpdateNewInfo',
			oldName: prevInfo.name,
			newName: newCourseData.name,
			newAbout: newCourseData.about
		})
	}



	course.save()
	.then((result) => {
		return res.json({
			message: 'course updated successfully'
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

exports.enrollInCourse = (req, res) => {
	console.log('req body enroll', req.body);
	courseId = req.body._id;
	let course = req.courseData;
	if (course.hasPassword && !course.checkPassword(req.body.password)) {
		return res.status(401).json({
			error: {
				status: 401,
				message: 'wrong course password'
			}
		})
	}
	course.students.push(req.auth);
	course.save()
	.then(course => {
		return User.findByIdAndUpdate(
			req.auth._id,
			{
				$push: {
					enrolledCourses: { _id: courseId }
				}
			},
			{new: true}
		)
	})
	.then(result => {
		return res.json({
			message: 'You have successfully enrolled in the course'
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

exports.getCoursesFiltered = async (req, res) => {

	//!!! add validation for sane request (e. g. can't post enrolled + teacher)
	let filter = {}, usersToPopulate = [], usersToPopulateSet = {}, foundCourses;
	let viewCourses = req.body.viewCourses;
	if (req.body.courseId){
		filter._id = req.body.courseId;
	}
	if (req.body.type){
		filter.type = req.body.type;
	}
	if (req.body.enrolled){
		await User.findOne({_id: req.body.enrolled})
		.populate('enrolledCourses', '_id')
		.then(user => {
			filter._id = {
				$in: user.enrolledCourses
			}
		}) 
		.catch(err => {
			console.log(err);
			res.status(err.status || 400)
				.json({
					error: err
				})
		})
		
	}
	if (req.body.teacher){
		await User.findOne({_id: req.body.teacher})
		.populate('teacherCourses', '_id')
		.then(user => {
			filter._id = {
				$in: user.teacherCourses
			}
		})
		.catch(err => {
			console.log(err);
			res.status(err.status || 400)
				.json({
					error: err
				})
		})
	}
	if (req.body.searchWord){
		//console.log('search word: ', req.body.searchWord);
		let reOptions = {
			$regex: req.body.searchWord,
			$options: 'i'
		}
		filter.$or = [
			{ name: reOptions },
			{ about: reOptions }
		]
	}
	Course.find({...filter})
	//maybe select only necessary info
		.populate('students')
		.populate('teachers')
		.populate('creator')
		.sort('name')//TODO optimize sorting - see bookmarks
		.then(courses => {
			foundCourses = courses;
			/*
				So many checks are used here to provide privacy - users shouldn't see course data, which they aren't meant to receive
			 */
			let userStatuses = [];
			for (let i = 0; i < courses.length; i++){
				userStatuses.push('');
			}
			for (let i = 0; i < courses.length; i++){
				userStatuses[i] = 'not enrolled';
				courses[i].salt = undefined;
				courses[i].hashed_password = undefined;
				if (courses[i].type === 'public'){
					continue;
				}
				if (!req.auth){
					courses[i].sections = undefined;
					courses[i].actions = undefined;
					courses[i].students = undefined;
					courses[i].creator = undefined;
					courses[i].updates = undefined;
					continue;
				}

				if (courses[i].invitedTeachers){
					let invitedTeachers = _.cloneDeep(courses[i].invitedTeachers);
					courses[i].invitedTeachers = undefined;
					for (let invited of invitedTeachers){
						if (invited.equals(req.auth._id)){
							courses[i].invitedTeachers = invitedTeachers;
							userStatuses[i] = 'invited teacher';
							break;
						}
					}
				}

				let isTeacher = false, isStudent = false;

				for (let student of courses[i].students){
					if (student.equals(req.auth._id)){
						isStudent = true;
						userStatuses[i] = 'student';
					}
					student.hideFields();
				}
				for (let teacher of courses[i].teachers){
					if (teacher.equals(req.auth._id)){
						isTeacher = true;
						userStatuses[i] = 'teacher';
					}
					teacher.hideFields();
				}
				courses[i].creator.hideFields();

				if (courses[i].creator._id.equals(req.auth._id)){
					userStatuses[i] = 'creator';
					continue;
				}
				if (isTeacher){
					continue;
				}
				if (isStudent){
					courses[i].creator = undefined;
					continue;
				}

				courses[i].creator = undefined;
				courses[i].actions = undefined;
				courses[i].sections = undefined;
				courses[i].students = undefined;
				courses[i].updates = undefined;
			}

			//Populating different fields in this loop
			//This loop can be used not only for forums, but for all other types of entries

			for (let c = 0; c < courses.length; c++){
				if (!courses[c].sections){
					continue;
				}



				for (let i = 0; i < courses[c].sections.length; i++){
					for (let j = 0; j < courses[c].sections[i].entries.length; j++){
						let entry = courses[c].sections[i].entries[j];

						if (entry.access === 'teachers' &&
							!(userStatuses[c] === 'teacher' || userStatuses[c] === 'creator')
						){
							courses[c].sections[i].entries[j] = undefined;
							continue;
						}

						if (entry.type === 'forum'){

							//populate topic creators and posts creators
							for (let topic of entry.content.topics){
								if (!usersToPopulateSet[topic.creator._id]){
									usersToPopulateSet[topic.creator._id] = 1;
									usersToPopulate.push(topic.creator._id);
								}

								for (let post of topic.posts){
									if (!usersToPopulateSet[post.creator._id]){
										usersToPopulateSet[post.creator._id] = 1;
										usersToPopulate.push(post.creator._id);
									}
								}
							}
						}
					}
				}
			}
			return User.find({
				_id: {
					$in: usersToPopulate
				}
			})
		})
		.then((users) => {
			for (let user of users){
				user.hideFields();
				usersToPopulateSet[user._id] = user;
			}

			for (let c = 0; c < foundCourses.length; c++){
				if (!foundCourses[c].sections){
					continue;
				}

				for (let i = 0; i < foundCourses[c].sections.length; i++){
					for (let j = 0; j < foundCourses[c].sections[i].entries.length; j++){
						let entry = foundCourses[c].sections[i].entries[j];

						if (entry && entry.type === 'forum'){

							//populate topic creators and posts creators
							for (let t = 0; t < foundCourses[c].sections[i].entries[j].content.topics.length; t++){
								foundCourses[c].sections[i].entries[j].content.topics[t].creator =
									usersToPopulateSet[
										foundCourses[c].sections[i].entries[j].content.topics[t].creator._id
										];

								for (let p = 0; p < foundCourses[c].sections[i].entries[j].content.topics[t].posts.length; p++){
									foundCourses[c].sections[i].entries[j].content.topics[t].posts[p].creator =
										usersToPopulateSet[
											foundCourses[c].sections[i].entries[j].content.topics[t].posts[p].creator._id
											];
								}
							}
						}
					}
				}
			}

			return new Promise((resolve, reject) => {
				resolve(true);
			})
		})
		.then(() => {
			if (req.body.select){
				let selectSet = {};
				for (let s of req.body.select){
					selectSet[s] = 1;
				}
				for (let i = 0; i < foundCourses.length; i++){
					for (let v of Object.keys(foundCourses[i]._doc)){
						if (!selectSet[v]){
							foundCourses[i][v] = undefined;
						}
					}
				}
			}


			return res.json(foundCourses);
		})
		.catch(err => {
			console.log(err);
			res.status(err.status || 400)
				.json({
					error: err
				})
		})
}

exports.deleteCourse = (req, res) => {
	Course.deleteOne({ _id: req.courseData._id})
	.then(() => {
		res.json({
			message: 'course deleted successfully'
		})
	})
	.catch(err => {
		console.log(err);
		res.status(err.status || 400)
			.json({
				error: err
			})
	})

}

exports.entryById = (req, res, next, entryId) => {
	let len = 0;
	if (req.courseData.sections){
		len = req.courseData.sections.length
	}
	for (let section = 0; section < len; section++){
		for (let i = 0; i < req.courseData.sections[section].entries.length; i++){
			let entry = req.courseData.sections[section].entries[i];
			if(entry._id == entryId){
				req.entry = {
					data: entry,
					section: section,
					pos: i
				}
				return next();
			}
		}
	}

	return res.status(404).json({
		error: {
			status: 404,
			message: "No entry with this id was found"
		}
	})
}

exports.getUpdatesNotifications = (req, res) => {
	let userSubbedSet = {};

	for (let c of req.auth.subscribedCourses) {
		userSubbedSet[c.course] = c.lastVisited;
	}

	Course.find({
		_id: {
			$in: req.body.courses
		}
	})
		.then((courses) => {
			let result = {};
			for (let c of courses){
				let lastVisited = userSubbedSet[c._id], curResult = 0;
				if (!lastVisited){
					continue;
				}
				for (let u of c.updates){
					if (u.created > lastVisited){
						curResult++;
					}
				}
				if (curResult > 0){
					result[c._id] = curResult;
				}
			}

			console.log(result);

			return res.json(result);
		})
		.catch(err => {
			console.log(err);
			res.status(err.status || 400)
				.json({
					error: err
				})
		})
}

