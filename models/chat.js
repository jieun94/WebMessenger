var mongoose = require('mongoose');
var moment =require('moment');
require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");
var date = moment().format('YYYY-MM-DD HH:mm:ss');

var Schema = mongoose.Schema;

var chatSchema = new Schema( {
    
    _roomid: {type: String, ref: 'chatRoom' },
    sender: { userCode: String, profileImg: String, userName: String },
    receiver: { userCode: String, profileImg: String, userName: String },
    contents: {type: String, require: true },
    isRead: {type: Boolean},
    createdAt: {type: String, default: date }

});

module.exports = mongoose.model('Chat', chatSchema);