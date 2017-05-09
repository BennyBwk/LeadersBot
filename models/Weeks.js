const {mongoose} = require('../database/db.js');

const Weeks = mongoose.model('Weeks', new mongoose.Schema({
    week: Number,
    weekid: Number
}));

module.exports = Weeks ;
