var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var SchemaTypes = mongoose.Schema.Types;
require('mongoose-double')(mongoose);
// Thanks to http://blog.matoski.com/articles/jwt-express-node-mongoose/
 
// set up a mongoose model
var Watching = new Schema({
	user_id: {
		type: String,
		required: true
	},
	movie_id: {
		type: String,
        unique: true,
        required: true
	},
	current: {
		type: SchemaTypes.Double,
        required: true
	},
	infoHash: {
		type: String,
		requred: true
	},
	status: {
		type: String,
        required: true
	}
});
 
module.exports = mongoose.model('Watch', Watching);