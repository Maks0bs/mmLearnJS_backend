let {
    requireAuthentication
} = require('../../users/controllers')

let {
    getCoursesFiltered, getUpdatesNotifications,
} = require('../controllers')

let router = require('express').Router()

//TODO MOVE TO users route
//TODO MOVE TO users route!!!!!!!!!!!!!!!!!!!!!
router.post('/updates-notifications',
    requireAuthentication,
    getUpdatesNotifications
)

//TODO change of frontend
//TODO change to get with url params
router.post('/', getCoursesFiltered)

module.exports = router;