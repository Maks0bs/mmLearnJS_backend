module.exports = {
	...require('./courses'),
	...require('../../exercises/controllers/exercises'),
	...require('../../forums/controllers/forums'),
	...require('./subscription'),
	...require('./teachers')
}
/**
 * @class controllers.courses
 */