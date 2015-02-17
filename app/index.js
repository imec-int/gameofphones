var express = require('express');
var http = require('http');
var crypto = require('crypto');
var validator = require('validator');
var fs = require("fs");
var sqlite3 = require("sqlite3").verbose();
var app = express();
var _ = require('underscore');
var alienImages = require("./alienImages");

var log = require('./log');

// easy file based json db, just one object to store stuff (game data):
var jsondb =  require('./jsondb');
var gamedata = {
	games: []
};
jsondb.load(function (err, data) {
	if(data) gamedata = data;
});



alienImages.init({
	destinationFolder:__dirname + "/public/custom/",
	sourceFolder:__dirname + "/temp/source/",
    callback: newAlien
});

alienImages.watchFolder(__dirname + "/temp/images/", function (prev) {
	if (adminClient) sendAliens(adminClient);
});

app.use(express.static(__dirname + "/public"));

// Start server.
var server = http.createServer(app);

// Bind socket:
var io = require('socket.io').listen(server);
io.set('log level', 0);

//var colors=["0000FF","00FF00","00FFFF","FF00FF","FFFF00"];
var colors=["bear","cat","monkey","penguin"];

var cryptoKey = "key_ken";
var scoreDBFile = "JIMscores.db";


var scoreDB = new sqlite3.Database(scoreDBFile);
var countDownTime = 30000;
var countDownTimer = null;
var pinCode;
var gameBusy = false;

var maxplayers = 4;
var currentplayers = [];

scoreDB.serialize(function() {
	scoreDB.run("create table if not exists scores (name TEXT, email TEXT, score INTEGER)");
});


app.use(express.urlencoded());
app.use(express.json());
app.post('/addscore', function(req, res) {
	if (!req.param('score') || !req.param('email')|| !req.param('name')) {
		res.send(400, 'Naam of email adres niet meegegeven!');
		res.end();
		return;
	}

	var score=0;
	try {
		score = decryptScore(req.param('score'));
		if (!validator.isInt(score)) {
			throw new Error('Score klopt niet!');
		}
        score=parseInt(score);

	} catch (err) {
		res.send(400, 'Score klopt niet!');
		res.end();
		return;
	}

	var email=req.param('email');
	if (!validator.isEmail(email)) {
		res.send(400, 'email adres klopt niet!');
		res.end();
		return;
	}
    var name=req.param('name').trim();
    if(name.length<2){
        res.send(400,'naam is te kort/niet ingevuld!');
        res.end();
        return;
    }
    if(name.length>20){
        res.send(400,'naam is te lang!');
        res.end();
        return;
    }
	var stmt = scoreDB.prepare("INSERT INTO scores VALUES (?, ?, ?)");
	stmt.run(name, email, score);
	stmt.finalize();

	log('score saved', {ip: getRemoteIp(req), score: score, name: name, email: email});

	res.send(200, 'Uw score werd opgeslagen. Bedankt!');
	res.end();
    sendTopTen();
});
app.get('/getscores',function(req,res){
    res.type("text/csv");
    var scores=[];
    scoreDB.each("SELECT name, email,score FROM scores ORDER BY score DESC", function(err, row){
        res.write(row.name+";"+row.email+";"+row.score+"\n");
    },function(){
        res.end();
    });
});
app.get('/clearscores',function(req,res){
    scoreDB.run("DELETE from scores",function(err){})
    res.end();
});


app.post('/api/browsertoold', function (req, res) {
	log('browser too old', {useragent: req.get('User-Agent'), ip: getRemoteIp(req)});
});

function decryptScore(input) {
	var decipher = crypto.createDecipher('aes256', cryptoKey);
	return decipher.update(input, 'hex', 'utf8') + decipher.final('utf8');
}

function encryptScore(score) {
	var cipher = crypto.createCipher('aes256', cryptoKey);
	return cipher.update(''+score, 'utf8', 'hex') + cipher.final('hex');
}

io.sockets.on("connection",function (socket){

	socket.on('room', function (roomname) {
		socket.join(roomname);

		var ip = socket.handshake.address.address;

		if(roomname == 'mainscreen'){
			log('main screen connected', {ip: ip});
			mainscreenConnected(socket);
		}

		if(roomname == 'scorepanel'){
			log('scorepanel connected', {ip: ip});
			scorepanelConnected(socket);
		}

		if(roomname == 'pincodepanel'){
			log('pincode panel connected', {ip: ip});
			pincodepanelConnected(socket);
		}

		if(roomname == 'controller'){
			log('controller connected', {ip: ip});
			controllerConnected(socket);
		}

		if(roomname == 'player'){
			log('controller connected', {ip: ip});
			playerConnected(socket);
		}
	});
});

function mainscreenConnected (socket) {

	// init game when mainscreen is refreshed:
	initNewGame();

	// a player is killed:
  	socket.on('kill',function (data) {

  		var player = _.find(currentplayers, function (player) {
  			return player.index == data.player;
  		});

  		if(!player) return log('A non-existing player was killed, strange. playerindex was ' + data.player);

  		// kill player:
  		player.alive = false;

  		log('player was killed', player);

  		// send kill to smartphone:
  		io.sockets.in(player.socketioroom).emit('dead', {
  			score: data.score,
  			score_encrypted: encryptScore(data.score)
  		});

  		// check if all players are dead:
  		console.log('currentplayers', currentplayers);
  		var everybodysDead = true;
  		for (var i = currentplayers.length - 1; i >= 0; i--) {
  			if( currentplayers[i].alive ) everybodysDead = false;
  		};

  		if(everybodysDead){
  			// init a new game (dont start it):
  			log('everybody\'s dead');
  			initNewGame();
  		}
  	});


  	socket.on("disconnect",function (){
  		log('mainscreen disconnected', {ip: socket.handshake.address.address});
  	});

}

function scorepanelConnected (socket) {
	sendScores();

	socket.on("getscores",function(){
	    sendScores();
	});

	socket.on("disconnect",function (){
  		log('scorepanel disconnected', {ip: socket.handshake.address.address});
  	});
}

function pincodepanelConnected (socket) {
	io.sockets.in('pincodepanel').emit('updatepin', pinCode);

	socket.on("disconnect",function (){
		log('pincodepanel disconnected', {ip: socket.handshake.address.address});
	});
}

function controllerConnected (socket) {
	socket.on('admin', function (data) {
		if(data.loudness){
			io.sockets.in('mainscreen').emit("admin", data);
		}

		if(data == 'refreshHostscreen'){
			io.sockets.in('mainscreen').emit("refreshpage");
		}

		if(data == 'refreshScorescreen'){
			io.sockets.in('scorepanel').emit("refreshpage");
		}

		if(data == 'refreshPincodescreen'){
			io.sockets.in('pincodepanel').emit("refreshpage");
		}

		if(data == 'forceStartGame'){
			startGame();
		}
	});

	socket.on("gimmeAliens", function (data) {
		sendAliens(socket);
	});

	socket.on("setAlien", function (data) {
		io.sockets.in('mainscreen').emit("setAlien", data);
	});

    socket.on("removeAlien",function (data){
        io.sockets.in('mainscreen').emit("removeAlien",data);
    });

    socket.on("disconnect",function (){
    	log('controller disconnected', {ip: socket.handshake.address.address});
    });
}

function playerConnected (socket) {

	socket.on('enterpincode', function (data) {
		var playerip = socket.handshake.address.address;

		log('incomming player', {useragent: socket.handshake.headers['user-agent'], ip: playerip});

		// compose a socket.io room name based on the player's ip:
		var playerroomname = 'playerroom_'+socket.handshake.address.address;

		console.log('currentplayers', currentplayers);

		// check if player already exits:
		var player = _.find(currentplayers, function (player) {
			return playerroomname == player.socketioroom;
		});

		if(player){
			log('player is known', playerip);

			// add player to his room:
			socket.join(playerroomname);

			// listen for player events:
			listenForPlayerEvents(socket, player);

			// send update info to players' smartphone:
			io.sockets.in(player.sockioroom).emit('ok',{color: colors[player.index]});
			return;
		}



		log('player enters pincode', data.pin, playerip);
		// new player, check his pincode:

		// if (gameBusy) {
		// 	return socket.emit("nok", { status: "404", message: "game is busy" });
		// }

		if (pinCode != data.pin) {
			log('pincode is wrong');
			return socket.emit("nok", { status: "400", message: "invalid pin code" }); // i.e. no game found
		}

		log('pincode is right, checking if player slots are available');

		// check if there are player slots free:

		if(currentplayers.length < maxplayers){
			// assign the player to a new room:
			socket.join(playerroomname);
			log('player slot assinged', {ip: playerip});

			var playerindex = currentplayers.length;

			// create new player object:
			var player = {
				alive: true,
				socketioroom: playerroomname,
				index: playerindex,
				ip: playerip
			}

			log('new player', player);

			// add player to players:
			currentplayers.push(player);

			// send info to player screen and to host:
			io.sockets.in(player.sockioroom).emit('ok',{color: colors[player.index]});
			io.sockets.in('mainscreen').emit('live',{player: player.index});

			// listen for player events:
			listenForPlayerEvents(socket, player);

			// start countdown:
			if(currentplayers.length == 1)
				startGamestartCountdown();

			// if player slots are full, start game:
			if(currentplayers.length == maxplayers)
				startGame();

		}else{
			log('no player slots available');
			socket.emit("nok", { status: "409", message: "Game already busy." });
		}

	});
}

function listenForPlayerEvents (socket, player) {
	socket.on('up', function (data){
		io.sockets.in('mainscreen').emit('up', { player: player.index });
	});

	socket.on('down', function (data){
		io.sockets.in('mainscreen').emit('down', { player: player.index });
	});

	socket.on('shoot', function (data){
		io.sockets.in('mainscreen').emit('shoot', { player: player.index });
	});

	socket.on("disconnect",function (){
		log('player disconnected', {ip: socket.handshake.address.address});
	});
}

function sendTopTen(){
    var scores=[];
    scoreDB.each("SELECT name, score FROM scores ORDER BY score DESC LIMIT 10", function (err, row){
        scores.push(row);
    },function(){
        while(scores.length<10){
            scores.push({name:"Hodor",score:0});
        }
        io.sockets.in('mainscreen').emit('scores',scores);
    });

}
function sendScores(){
    var scores=[];
    scoreDB.each("SELECT name, score FROM scores ORDER BY score DESC",function(err,row){
        scores.push(row);
    },function(){
        io.sockets.in('scorepanel').emit('scores',scores);
    });
}

function generatePinCode() {
	return Math.floor(Math.random()*9000) + 1000;
}

function startGamestartCountdown () {
	clearGamestartCountdown();

	countDownTimer = setTimeout(startGame, countDownTime);
	io.sockets.in('mainscreen').emit("countdown",{timer:countDownTime});
}

function clearGamestartCountdown(){
	if (countDownTimer) {
	    clearTimeout(countDownTimer);
	    countDownTimer = null;
	}
}

function initNewGame() {
	log('initializing new game');

	// clear players:
	currentplayers = [];

	clearGamestartCountdown();

	pinCode = generatePinCode();
	log('new picode', pinCode);

	io.sockets.in('mainscreen').emit("newGame", { pin: pinCode });

	io.sockets.in('pincodepanel').emit('updatepin', pinCode);

	io.sockets.in('controller').emit("newGame");
}

function startGame() {
	gameBusy = true;

    clearGamestartCountdown();

	// instruct mainscreen to start game:
	io.sockets.in('mainscreen').emit("startGame");

	// instruct each smartphone to start game:
    for (var i=0; i<currentplayers.length; i++) {
        io.sockets.in(currentplayers[i].socketioroom).emit("start",{start:true});
    }

    // save data about game:
    var game = {
    	starttime: Date.now(),
    	players: currentplayers.length,
    	playerips: _.pluck(currentplayers, 'ip')
    }
    gamedata.games.push(game);
    jsondb.save(gamedata);


    log('game started');
}

function sendAliens(socket) {
	if (socket) alienImages.getLatestConverted(20, function(files) {
		socket.emit('aliens', files);
	})
}

function newAlien(alien){
	io.sockets.in('controller').emit('newAlien', alien);
}



function getRemoteIp (req) {
	// http://stackoverflow.com/questions/8107856/how-can-i-get-the-users-ip-address-using-node-js
	return req.headers['x-forwarded-for'] ||
			req.connection.remoteAddress ||
			req.socket.remoteAddress ||
			req.connection.socket.remoteAddress;
}

var webserverport = process.env.PORT || 3000;
server.listen(webserverport, function () {
	log("Express server listening on port " + webserverport);
});





