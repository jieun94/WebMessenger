var express = require('express');					// express module
var app = express();								// initialize express app
var server = require('http').createServer(app);		// create http server
var io = require('socket.io')(server);				// using socket.io in server
var formidable = require('formidable');				// file upload module
var md = require("node-markdown").Markdown;			// markdown module
var mongoose = require('mongoose');					//mongodb connect
//var route = require('./route.js');					//Api위한 router 설정
var bodyParser =require('body-parser');
var cors = require('cors');
var moment =require('moment');
require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");


// Static file configuration
app.use(express.static('public/js'));			// import all files in js directory
app.use(express.static('public/css'));			// import all files in css directory
app.use(express.static('public/uploads'));		// import all files in uploads directory
app.use(bodyParser.json());						//json으로 넘겨주기위해
app.use(bodyParser.urlencoded({ extended: true})); //qs모듈로 QueryString parsing
app.use(cors());


var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function(){

	//Connected to mongo server
	console.log("connected to mongo server");

});
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

var databaseUrl = 'mongodb://localhost:27017/';
//var awsUrl = 'mongodb://libero:200821@13.209.41.26:27017';
function mogooseConnecting () {
	mongoose.connect(databaseUrl,{ dbName: 'libero'}, function(err, db) {
		
		if( err ){
			console.log(`===> Error connecting to ${db}`);
			console.log(`Reason: ${err}`);

		}else{

			console.log(`===> succeeded in connecting to ${db}`);
		}

	});

}

mogooseConnecting ();
mongoose.connection.on('disconnected', () => {
	console.error('몽고디비 연결이 끊겼습니다. 연결을 재시도 합니다.');
	mogooseConnecting ();
});

//스키마 설정
var ChatRoom = require('./models/chatRoom');
var Chat = require('./models/chat');

// Server listen on port 3000
server.listen(3000);

// Variables
var messages = [];			// store messages
var socketIds = {};			//socket id들

// On client connect
io.on('connection', function(socket){
	var userId;
	
	//소켓아이디와 client 유저 아이디 연결
	socket.on('setSocketId', function(socketUser){
		console.log("setSocketId");
		userId = socketUser.userId;
		socket.nickname = socketUser.nickname;
		socket.profile = socketUser.profile;
		console.log("!!!"+ socketUser);
		socketIds[userId] = socket.id;
		console.log(socketIds);

	});

		console.log("Client connected...");
		console.log("소켓아이디"+socket.id);



	// Print chat history
	messages.forEach(function(msgContent){
		socket.emit('send message', msgContent);
	});

	var msgContent;
	var roomId;

	// Sent/Receive chat messages
	socket.on('send message', function(message, socketUser, otherUser){
		console.log("send message");
		userId = socket.userId;
		nickname = socket.nickname;
		profile = socket.profile;
		msgContent = msgFormat(userId, message);
		console.log(userId+otherUser.userId);
		ChatRoom.findOne({'userIds.userId': { $all:[userId, otherUser.userId] } }, function(err, result){
			console.log("result"+result);
	
			if(err) return console.log(err);
			
			if(result){
				console.log(result._id);	
				Chat.create({sender: { userId: userId ,  profile: profile , nickname: socketUser.nickname }, 
					receiver: { userId: otherUser.userId ,  profile: otherUser.profile , nickname: otherUser.nickname }, 
					contents: message , _roomid: result.id}, function(err, results){

					if(err) return console.log(err);
					console.log(Chat);
					console.log("chatCreateResult : "+results);
					socket.emit('send message', results); //나한테도 전송
					socket.to(socketIds[otherUser.userId]).emit('send message', results); //남한테도 전송

				});


			} else {
			
				socket.emit("err messege"); 

			}

		});
		
		console.log(socketIds[otherUser.userId]);
		console.log(msgContent);

	});

	socket.on('join', function(roomId, selectuser){
		console.log("join");
		console.log(roomId);
		console.log(selectuser);
		socket.join(roomId);

	})

	// chatting Room 만드는 코드
	socket.on('createChat', function(socketUser, otherUser){
		
		console.log("createChat");
		console.log(socketUser.userId);
		console.log(otherUser.userId);
		//찾는다
		ChatRoom.findOne({'userIds.userId': {$all: [socketUser.userId, otherUser.userId]}}, function(err, result){

			if(err){
				console.log(err);
				return;
		   }
		   console.log(result);
		   //없으면 새로 만든다.
		   if(result==null){
			   ChatRoom.create({userIds:[{ userId: socketUser.userId ,  profile: socketUser.profile , nickname: socketUser.nickname },
				{ userId: otherUser.userId ,  profile: otherUser.profile , nickname: otherUser.nickname }]}, function(err, results){
				if(err) return console.log("Data Error: ", err);
				console.log(results);
				socket.emit('add user', results);
				socket.to(socketIds[otherUser.userId]).emit('add user', results);
		   	
				});
		}

		});
		
	});

	socket.on('deleteChat', function(roomId){
		console.log("delete"+roomId);
		console.log(socket.userId);
		ChatRoom.findOne({_id: roomId}, function(err, result){
		
			if(err) { console.log(err); return; }

			if(result){
		
				ChatRoom.deleteOne({_id: roomId}, function(err){
					if(err){
						console.log(err);
						return;
					}
				});
			}
	});


	});

	// Remove user when disconnect
	socket.on('disconnect', function(){
		socket.leave();
		delete socketIds[userId];
		clearInterval(socket.interval);
		console.log(userId+" disconnected");
	});

});

// Connect to index.html
app.get('/', function(request, response){
	response.sendFile(__dirname + '/public/index.html');
});

// Upload
app.post('/api/uploadImage',function (req, res){
	var imgdatetimenow = Date.now();
	var form = new formidable.IncomingForm({
      	uploadDir: __dirname + '/public/uploads',
      	keepExtensions: true
	});

	form.on('end', function() {
      res.end();
    });
    
    form.parse(req,function(err,fields,files){
		var data = { 
				username : fields.username, 
				serverfilename : baseName(files.attached.path), 
				filename : files.attached.name,
				size : bytesToSize(files.attached.size)
		};
	    var msgContent = imgFormat(data.username ,data.serverfilename);
		io.sockets.emit('send message', msgContent);
		
    });
});

//list불러오기
app.get('/chat/getChatList/:userId', function(req, res, err) {
	console.log("/chat/getChatList/");
	console.log(req.params.userId);
	ChatRoom.find( {'userIds.userId' : req.params.userId }, function(err, roomList){

		if(err) {
			console.err(err);
			throw err;
		}
		console.log(roomList);
		res.set({'access-control-allow-origin':'*'});
		res.status(200).send(roomList);

	});
});

app.get('/chat/getChat/:roomId', function(req, res, err) {
	console.log("/chat/getChat/");
	console.log(req.params.roomId);
	Chat.find({_roomid: req.params.roomId}, function(err, messages){

		if(err) {
			console.error(err);
			throw err;
		}
		console.log(messages);
		res.set({'access-control-allow-origin':'*'});
		res.status(200).send(messages);

	});
});





// Message format
var msgFormat = function(author, msg){
	var content = "<div class='media'><div class='media-left'><span class='author' style='font-weight: bold; color: black;'>" + author + "</span></div><div class='media-body'><span class='msg-body'>" + md(msg) + "</span></div></div>";
	return content;
}

// Image format
var imgFormat = function(author, imgPath){
	var content = "<div class='media'><div class='media-left'><span class='author' style='font-weight: bold; color: black;'>" + author + "</span></div><div class='media-body'><img src='"+imgPath+"' height='150'></img></div></div>";
	return content;
}

var userFormat = function(result) {


}

// Size Conversion
function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    if (i == 0) return bytes + ' ' + sizes[i]; 
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

//get file name from server file path
function baseName(str)
{
   var base = new String(str).substring(str.lastIndexOf('/') + 1);  
   console.log(base);   
   return base;
}


