//----DB MODULE IMPORTS------
const mongoose = require('mongoose');

//Lets connect to our database using the DB server URL.
// mongoose.connect("mongodb://botmongodb:l8sy2gzpQbMxnPGw6ajvVmlZiIDUGewOIg37LqynD81RwV5oQuttLpJ7fLOZeXpGatJucyWlr3FpsJi9fk5g0w==@botmongodb.documents.azure.com:10250/?ssl=true");
mongoose.connect("mongodb://localhost:27018/leadbotdb");
// mongodb://localhost:27017/seventhreebot

module.exports = {
    mongoose:mongoose
}
