var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var SchemaTypes = mongoose.Schema.Types;
require('mongoose-double')(mongoose);
// Thanks to http://blog.matoski.com/articles/jwt-express-node-mongoose/
 
// set up a mongoose model
var WatchList = new Schema({
	user_id: {
		type: String,
		required: true
	},
	movie_id: {
		type: String,
        unique: true,
        required: true
	}
});
 
module.exports = mongoose.model('WatchList', WatchList);