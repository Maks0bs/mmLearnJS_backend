let {validate} = require("../../helpers");
let {
    requireAuthentication,
    getUser,
    userById,
    addNotifications,
    getUsersFiltered,
    //TODO add validator with !!!all!!! params
    updateUser,
    deserializeAndCleanData,
    isAuthenticatedUser,
    getUpdatesByDate,
    deleteUser,
    removeUserMentions
} = require('../controllers');
let {
    uploadFiles,
    deleteFiles
} = require('../../files/controller')
let {
    userDataValidator
} = require('../controllers/validators')
let router = require('express').Router()

router.get('/', getUsersFiltered)
router.get('/:userId', getUser);
//router.POST('/notifications/', addNotifications);
router.post('/filter', getUsersFiltered);

router.put('/:userId',
    requireAuthentication,
    isAuthenticatedUser,
    uploadFiles,
    deserializeAndCleanData,
    userDataValidator(null, 'name', 'email', 'password'),//TODO add more validators for each user field
    validate,
    deleteFiles,
    updateUser
);
router.delete('/:userId',
    requireAuthentication,
    isAuthenticatedUser,
    removeUserMentions,
    deleteFiles,
    deleteUser
)
router.post('/updates-by-date',
    requireAuthentication,
    getUpdatesByDate
)

router.param('userId', userById);

module.exports = router;