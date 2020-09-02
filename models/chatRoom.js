var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var chatRoomSchema = new Schema( {
    
    userCodes: [{ userCode: String, profileImg: String, userName: String }]

});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);