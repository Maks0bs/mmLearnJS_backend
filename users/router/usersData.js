let {
    requireAuthentication,
} = require('../controllers/auth');
let {
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
} = require('../controllers/main');
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
//router.post('/notifications/', addNotifications);
router.post('/filter', getUsersFiltered);

router.put('/:userId',
    requireAuthentication,
    isAuthenticatedUser,
    userDataValidator,
    uploadFiles,
    deserializeAndCleanData,
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