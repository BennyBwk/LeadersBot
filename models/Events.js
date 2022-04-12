const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const {mongoose} = require('../database/db.js');

const Events = mongoose.model('Events', new mongoose.Schema({
    name: String,
    date: String,
    time: String,
    location: String,
    lastUpdatee: String,
    updatedDateTime: String
}));

module.exports = Events;
