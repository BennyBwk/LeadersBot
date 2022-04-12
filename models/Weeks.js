const {mongoose} = require('../database/db.js');

const Weeks = mongoose.model('Weeks', new mongoose.Schema({
    weekid: Number,
    saturday: Number,
    sunday: Number,
    month: String,
    year: Number,
    last_updatee: String,
    last_updated: String
}));

module.exports = Weeks ;
