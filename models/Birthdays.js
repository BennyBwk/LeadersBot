const {mongoose} = require('../database/db.js');

const Birthdays = mongoose.model('Birthdays', new mongoose.Schema({
    name: String,
    birthdate: String,
    age: Number,
    status: String
}));

module.exports = Birthdays;
