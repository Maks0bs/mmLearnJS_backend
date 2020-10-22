let Course = require('../model')
let User = require('../../users/model');
let Exercise = require('../../exercises/model');
const { handleError} = require("../../helpers");

const entryById = (req, res, next, entryId) => {
    let len = 0;
    if (req.course.sections){
        len = req.course.sections.length
    }
    for (let section = 0; section < len; section++){
        for (let i = 0; i < req.course.sections[section].entries.length; i++){
            let entry = req.course.sections[section].entries[i];
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
exports.entryById = entryById;

const removeEntriesMentions = (req, res, next) => {
    //TODO remove entry mentions
}
exports.removeEntriesMentions = removeEntriesMentions;

const deleteEntries = (req, res, next) => {
    //TODO remove entry mentions
}
exports.deleteEntries = deleteEntries;