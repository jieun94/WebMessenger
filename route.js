const express = require('express');
const router = express.Router();
const ChatRoom = require('./models/chatRoom');

router.get('/chat/:userCode', (req, res) => {
    console.log("처음 접근");
    ChatRoom.find().all({ userCode: req.params.userCode }, (err, result) => {
    if(err) {
        return next(err);
    }
    res.json(result);
    });
});


module.exports = router;