let {
    signup,
    activateAccount,
    signin,
    getAuthenticatedUser,
    requireAuthentication,
    logout,
    inviteSignup,
    sendActivationLink,
    forgotPassword,
    resetPassword
} = require('../controllers/auth');

let {
    passwordValidator,
    userDataValidator
} = require('../controllers/validators')

let {
    validate
} = require('../../helpers')

let router = require('express').Router()

router.post('/signup',
    userDataValidator(null, 'name', 'password', 'email'),
    validate,
    signup
);
router.post('/signin', signin);
router.post('/activate', activateAccount);
router.get('/cur-user', getAuthenticatedUser);
router.get('/logout', logout);
router.post('/invite-signup', inviteSignup);
router.post('/send-activation', requireAuthentication, sendActivationLink)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

module.exports = router;