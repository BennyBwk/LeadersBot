//----DB MODULE IMPORTS------
const mongoose = require('mongoose');

//Lets connect to our database using the DB server URL.
mongoose.connect("mongodb://heroku_9w1xhcf1:9lol71lcd62ufeurrg9q5e98na@ds143231.mlab.com:43231/heroku_9w1xhcf1");

module.exports = {
    mongoose:mongoose
}
