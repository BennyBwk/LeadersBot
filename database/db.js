//----DB MODULE IMPORTS------
const mongoose = require('mongoose');

//Lets connect to our database using the DB server URL.
mongoose.connect("mongodb://bennyMongoDB:sULWq7AWHIO3jIRA@cluster0-shard-00-00.sfvzk.mongodb.net:27017,cluster0-shard-00-01.sfvzk.mongodb.net:27017,cluster0-shard-00-02.sfvzk.mongodb.net:27017/BE5LeadersBotDB?ssl=true&replicaSet=atlas-h5je5d-shard-0&authSource=admin&retryWrites=true&w=majority");

module.exports = {
    mongoose: mongoose
}
