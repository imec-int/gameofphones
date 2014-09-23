var express = require('express');
var http = require('http');
var crypto = require('crypto');
var validator = require('validator');
var fs = require("fs");
var sqlite3 = require("sqlite3").verbose();
var app = express();
var alienImages = require("./alienImages");

alienImages.init({
	destinationFolder: "temp/converted/",
	sourceFolder: "temp/source/",
    callback: newAlien
});

alienImages.watchFolder("temp/images/", function(prev) {
	if (adminClient) sendAliens(adminClient);
})

app.use(express.static('../sound-defender'));

// Start server.
var server = http.createServer(app);

var io = require('socket.io').listen(server);
//var colors=["0000FF","00FF00","00FFFF","FF00FF","FFFF00"];
var colors=["bear","cat","monkey","penguin"];
var connections=0;
var host=null;
var adminClient=null;
var adminvars=null;
var scorepanel=null;
var pincodepanel=null;
// var players=[];

var cryptoKey = "key_ken";
var scoreDBFile = "JIMscores.db";
var nrOfPlayers = 4;

var scoreDB = new sqlite3.Database(scoreDBFile);
var countDownTime = 30000;
var startGameCountDown;
var pinCode;

function Player(id, socket) {
	this.alive = false;
	this.socket = socket;
	this.id = id;
}

var players = new Array(nrOfPlayers);
for (var i=0; i<nrOfPlayers; i++) {
	players[i] = new Player(i);
}

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

	console.log("score: "+score+" email: "+email+" naam: "+name);
	res.send(200, 'Uw score werd opgeslagen. Bedankt!');
	res.end();
    sendTopTen();
});

function decryptScore(input) {
	var decipher = crypto.createDecipher('aes256', cryptoKey);
	return decipher.update(input, 'hex', 'utf8') + decipher.final('utf8');
}

function encryptScore(score) {
	var cipher = crypto.createCipher('aes256', cryptoKey);
	return cipher.update(''+score, 'utf8', 'hex') + cipher.final('hex');
}

io.sockets.on("connection",function(socket){

	socket.emit('news', { hello: 'world' });
	socket.on("client",function(data){
		var accepted = false;

		if (!pinCode) {
			socket.emit("nok", { status: "404", message: "no game found" });
			socket.disconnect();
			return;
		}

		if (pinCode != data.pin) {
			socket.emit("nok", { status: "400", message: "invalid pin code" }); // i.e. no game found
			socket.disconnect();
			return;
		}

		for (var i=0; i<players.length; i++) {
			if (!players[i] || !players[i].alive) {
				console.log("creating client");
				players[i] = new Player(i, socket);
				socket.player = players[i];
				socket.player.alive = true;
				socket.emit('ok',{color:colors[i]});
				if(host!=null){
					host.emit('live',{player:i});
				}
				accepted = true;
				break;
			}
		}

		if (accepted) {
			verifyGameState();
		} else {
			console.log(players);
			socket.emit("nok", { status: "409", message: "Game already busy." });
			socket.disconnect();
		}
	});
	socket.on("host",function(){

        console.log('received host from: '+socket.handshake.address.address);
		host=socket;
		if(adminvars!==null){
			socket.emit('admin',adminvars);
			adminvars=null;
		}
        sendTopTen();
		initNewGame();
	});
	socket.on("scorepanel",function(){
		console.log('received scorepanel from: '+socket.handshake.address.address);
		scorepanel=socket;
		sendScores();
	})
    socket.on("getscores",function(){
        sendScores();
    })
	socket.on("pincodepanel",function(){
		pincodepanel=socket;
	})
	socket.on("gimmeAliens", function(data) {
		sendAliens(socket);
	});
	socket.on("setAlien", function(data) {
		if (host) host.emit("setAlien", data);
	});
    socket.on("removeAlien",function(data){
        if(host) host.emit("removeAlien",data);
    });
	socket.on("admin", function(data){
		if (data.hello) {
			adminClient=socket;
			return;
		}
		if(host===null){
			if(adminvars===null){
				adminvars=data;
			}else{
				adminvars.channels=data.channels||adminvars.channels;
				adminvars.scale=data.scale||adminvars.scale;
				adminvars.loudness=data.loudness||adminvars.loudness;
			}
		}else{
			console.log('admin');
			console.log(data);
			host.emit('admin',data);
		}
	});
  	socket.on('up', function(data){
  		if(host!=null && socket.player && socket.player.alive) host.emit('up',{player:socket.player.id});
  	});
  	socket.on('down', function(data){
		if(host!=null && socket.player && socket.player.alive) host.emit('down',{player:socket.player.id});
  	});
  	socket.on('shoot', function(data){
		if(host!=null && socket.player && socket.player.alive) host.emit('shoot',{player:socket.player.id});
  	});
  	socket.on('kill',function(data){
	    for (var i=0; i<players.length; i++) {
		    var player=players[i];
		    if (player && player.id === data.player && player.alive) {
			    player.alive = false;
			    if (player.socket) {
				    player.socket.emit('dead',{score:data.score, score_encrypted: encryptScore(data.score)});
			    }
			    player.socket = undefined;
			    verifyGameState();
			    break;
		    }
	    }
  	});
  	socket.on("disconnect",function(data){

  		if(socket.player){
            if(host!==null){
                host.emit('lost',{id:socket.player.id});
            }
  			socket.player.alive = false;
			socket.player.socket = undefined;
  			delete socket.player;

  		}
  		if(socket==host){
  			host=null;
  		}else{
  			connections--;
			verifyGameState();
  		}
  	});
});
function sendTopTen(){
    if(host!==null){
        var scores=[];
        scoreDB.each("SELECT name, score FROM scores ORDER BY score DESC LIMIT 10", function(err, row){
                scores.push(row);
        },function(){
            while(scores.length<10){
                scores.push({name:"Hodor",score:0});
            }
            host.emit('scores',scores);
        });
    }
}
function sendScores(){
    if(scorepanel!==null){
        var scores=[];
        scoreDB.each("SELECT name, score FROM scores ORDER BY score DESC",function(err,row){
            scores.push(row);
        },function(){
            scorepanel.emit('scores',scores);
        })
    }
}
function generatePinCode() {
	return Math.floor(Math.random()*9000) + 1000;
}
var wasAllDead=true;
function verifyGameState() {
    if (!host) {
        pinCode = null;
        return;
    }
	var allAlive = true;
	var allDead = true;

	for (var i=0; i<players.length; i++) {
		if (players[i].alive) {
			allDead = false;
		} else {
			allAlive = false;
		}
	}

	if (allDead) {
        if(!wasAllDead){
            wasAllDead=allDead;
            initNewGame();
        }
        return;
	}

    wasAllDead=allDead;

	if (allAlive) {
        if (startGameCountDown) {
            clearTimeout(startGameCountDown);
            startGameCountDown = null;
        }
        startGameCountDown = setTimeout(startGame, 3000);
	} else {
        if (!startGameCountDown) {
            startGameCountDown = setTimeout(startGame, countDownTime);
            if(host!==null){
                host.emit("countdown",{timer:countDownTime});
            }
        }
    }
}

function startGame() {
    pinCode = null;
    if (startGameCountDown) {
        clearTimeout(startGameCountDown);
        startGameCountDown = null;
    }
    if (host) host.emit("startGame");
    for (var i=0; i<players.length; i++) {
        var player=players[i];
        if (player &&  player.alive && player.socket) {
            player.socket.emit("start",{start:true});
        }
    }
}

function sendAliens(socket) {
	if (socket) alienImages.getLatestConverted(20, function(files) {
		socket.emit('aliens', files);
	})
}
function newAlien(alien){
    if(adminClient) adminClient.emit('newAlien',alien);
}

function initNewGame() {
    if (startGameCountDown) {
        clearTimeout(startGameCountDown);
        startGameCountDown = null;
    }
	pinCode = generatePinCode();
	if (host) host.emit("newGame", { pin: pinCode });
	if (pincodepanel) pincodepanel.emit("newGame", { pin: pinCode });
    if(adminClient) adminClient.emit("newGame");
}

server.listen(process.env.PORT || 9080);
