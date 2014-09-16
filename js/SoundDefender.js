function SoundDefender(target) {
    var mp3url;
    var mural = new Mural(target, false, false);
    var playArea = mural.addPlayArea();
    var points = 256;
    var loudScale = 400;
    var path = new Poly();
    var context, javascriptNode, analyser;
    var soundArray=[];
    var maxHeight=playArea.ctx.canvas.height-50;
    var alienSpeed=new Vector2D(-playArea.ctx.canvas.width/points,0);
    var alienCrash=new Vector2D(0,playArea.ctx.canvas.height/200);
    var aliens=[];
    var bullets=[];
    var players=new Array(5);
    var audio;
    var godmode = false;
    var startGameCountDown = 0;
    var addAliensInterval;
    var startGameCountDownInterval;
    var seagullShootAngles=[190,180,170,160,150,160,170,180];
    var gopScreen=true;
    var helmetstart=100;
    var helmetmax=10;
    var helmetbase=-5;
    var gameOn=false;
    var godTime=500;
    var shipImages = ["players/bear.png","players/cat.png","players/monkey.png","players/penguin.png","img/pFFFF00.png"];
    var customs=["cedrik.png"];

    function Player(playArea, id) {
        this.shots=[];
        this.hits=0;
        this.id=id;
        this.lives=3;
        this.godcounter=godTime;
        this.godmode=true;

        this.ship = new Sprite(shipImages[id],200,200,100,125);
        //this.ship = new Sprite(shipImages[id],155,75,87,50);
        this.ship.setCollisionBox(-100+56,-125+30,-100+147,-100+155); // 2-124 2-54  56-147  30-155
        this.ship.addAnimation("fly",[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]);
        this.ship.addAnimation("death",[26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,-1],function(){
            this.lives--;
            if(this.lives===0){
                killPlayer(this);
            }else{
                respawn(this);
            }
        }.bind(this));
        this.dying=false;
        //this.ship.setCollisionBox(-80,-30,60,10);
        playArea.addChild(this.ship,1);
        this.ship.startAnimation("fly");
        this.ship.autoAnim(true);
        this.ship.setSpeed(2);
        this.ship.setCoords([219+(id*200),199]);
        this.ship.setAngle(0);
        this.ship.setScale(1);
        this.ship.simpleAngle=0;

        for(var s=0;s<5;s++){
            var shoot=new Sprite('lasers/'+id+'.png',150,50,100,25);
            shoot.addAnimation("bang",[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]);
            shoot.setCollisionBox(-70,-5,10,5); // 30-110 20-30
            playArea.addChild(shoot,0);
            shoot.startAnimation("bang");
            shoot.autoAnim(true);
            shoot.setSpeed(2);
            shoot.setCoords([0,-20]);
            shoot.setScale(1);
            this.shots.push(shoot);
        }

        this.cleanUp = function() {
            if (this.ship) this.ship.kill();
            this.ship = null;
            this.shots.forEach(function(shot) { try { playArea.removeChild(shot); } catch (err) {} });
            this.shots = [];
            this.hits = 0;
        };

        this.fireShot = function(){
            if (!this.ship) return;
            for (var s = 0; s < this.shots.length; s++) {
                if (!this.shots[s].move) {
                    var shoot = this.shots[s];
                    shoot.setCoords(this.ship.getCoordObj());
                    shoot.setAngle(this.ship.getAngle());
                    shoot.move = shoot.rotation.cloneVector();
                    shoot.move.setLength(20);
                    var offset=shoot.move.cloneVector();
                    offset.multiply(4);
                    shoot.addCoords(offset);
                    break;
                }
            }
        };

        this.moveDown = function() {
            if (!this.ship) return;
            this.ship.simpleAngle+=5;
            if (this.ship.simpleAngle > 10) {
                this.ship.simpleAngle = 10;
            }
            this.ship.setAngleDegrees(this.ship.simpleAngle);
        };

        this.moveUp = function() {
            if (!this.ship) return;
            this.ship.simpleAngle-=5;
            if (this.ship.simpleAngle < -10) {
                this.ship.simpleAngle = -10;
            }
            this.ship.setAngleDegrees(this.ship.simpleAngle);
        };

        this.straight = function() {
            if (!this.ship) return;
            if (this.ship.simpleAngle !== 0) {
                if (this.ship.simpleAngle < 0) {
                    this.ship.simpleAngle+=game.ticks;
                    this.ship.setAngleDegrees(this.ship.simpleAngle);
                } else {
                    this.ship.simpleAngle-=game.ticks;
                    this.ship.setAngleDegrees(this.ship.simpleAngle);
                }
            }
        }

    }
    function respawn(player){
        player.dying=false;
        player.ship.startAnimation("fly");
        player.ship.setCoords([219+(player.id*200),199]);
        player.ship.setAngle(0);
        player.ship.setScale(1);
        player.ship.simpleAngle=0;
        player.ship.setAlpha(0.5);
        player.godmode=true;
        player.godcounter=godTime;
    }

    function Alien(playArea) {
        /*helmetbase++;
        if(helmetbase>0) helmetbase=0;
        helmetstart--;
        if(helmetstart<helmetmax)helmetstart=helmetmax;*/
        var img='';
        var rand=Math.rnd(-1,customs.length);
        if(rand>0){
            img="custom/"+customs[rand-1];
        }else{
            img='aliens/space_bad_0'+Math.rnd(0,3)+'.png';
        }
        this.helmet=false;
        /*if(rand===helmetbase){
            img='img/helmet.png';
            this.helmet=true;
        }*/
        Sprite.apply(this,[img,200,200,95,129]);
        //this.setRotationOffsetDegrees(-180);
        //alien.setCollisionBox(-24,-27,28,25); 51-139 40-145
        this.setCollisionBox(-95+51,-129+40,-95+139,-129+145);
        //this.setCollisionBox(-13,-29,32,33);
        this.addAnimation("fly",[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]);
        //if(!this.helmet){
            this.addAnimation("death",[26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,-1],function(){
                killAlien(this);
            }.bind(this));
        //}
        playArea.addChild(this,2);
        this.startAnimation("fly");
        this.autoAnim(true);
        this.setSpeed(2);
        this.setCoords([-200,-200]);
        this.setScale(1);
        this.active=false;
        this.pointer = new Drawable(0,0,0);
        this.addChild(this.pointer,true);
        this.pointer.setCoords([-95+51,0]);

        this.cleanUp = function() {
            try { playArea.removeChild(this); } catch (err) {}
        }
    }
    Alien.prototype = Sprite.prototype;

    function Bullet(playArea) {
        //Sprite.apply(this,['img/bullet.png', 16, 16, 8, 8]);
        Sprite.apply(this,['lasers/alien.png', 150, 30, 20, 15]);
        //this.setCollisionBox(-4, -4, 4, 4);
        this.setCollisionBox(-100, 22, 20, 8,true);  //20-120     8-22
        playArea.addChild(this, 3);
        this.setCoords([0,-10]);
        this.addAnimation("pulse", [0, 1, 2, 3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]);
        this.startAnimation("pulse");
        this.autoAnim(true);
        this.setSpeed(2);
        this.setScale(1);
        this.setRotationOffsetDegrees(-180);
        this.active=false;

        this.cleanUp = function() {
            try { playArea.removeChild(this); } catch (err) {}
        }
    }
    Bullet.prototype = Sprite.prototype;

    //var shoot=new Sprite('img/shoot.png',145,11,140,6);
    //shoot.setCollisionBox(-120,-5,5,5);

    // sound defender nodejs backend
    var socket = io.connect("/");
    socket.on('news', function () {
        socket.emit('host');
        socket.on('down',function(data){
            if (players[data.player]) players[data.player].moveDown();
        });
        socket.on('up',function(data){
            if (players[data.player]) players[data.player].moveUp();
        });
        socket.on('shoot',function(data){
            if (players[data.player]) players[data.player].fireShot();
        });
        socket.on('live',function(data){
            console.log("live!: ");
            createPlayer(data.player);
        });
        socket.on('newGame', function(data) {
            godmode = true;
            initNewGame();
            document.getElem("#pincode b").setText(data.pin);
        });
        socket.on('lost',function(data){
            for(i=0;i<players.length;i++){
                if(players[i] && players[i].id==data.id){
                    killPlayer(players[i]);
                    break;
                }
            }
        });
        socket.on('scores', function(data){
            updateTopTen(data);
        });
        socket.on('startGame', startGame);
         socket.on('admin',function(data){
             if(data.scale){
                 scale=data.scale;
             }
             if(data.loudness){
                 loudScale=data.loudness;
             }
         });
        socket.on('countdown',function(data){
            startCountDown(data.timer);
        })
    });
    function updateTopTen(data){
        var kol1=document.getElem('#kol1').clearElem();
        var kol2=document.getElem('#kol2').clearElem();
        for(var i=0;i<data.length;i++){
            var write=i<5?kol1:kol2;
            write.span({class:'listfield'},(i+1)+'.');
            write.span({class:'namefield'},data[i].name);
            write.span({class:'scorefield'},''+data[i].score);
        }
    };
    function createPlayer(index) {
        if(players.length<index || players[index]==null){
            players[index] = new Player(playArea, index);
            document.getElem("#ship"+index).removeClass("hide");
        }
    }
    cdtimer=null;
    cdowner=99;
    function startCountDown(timer){
        if(cdtimer!==null) {
            clearInterval(cdtimer);
            cdtimer=null;
        }
        var countDownElem = document.getElem("#countdown");
        countDownElem.style.width="99%";
        cdowner=99;
        cdtimer=setInterval(counterdown,timer/99);
    }
    function counterdown(){
        var countDownElem = document.getElem("#countdown");
        cdowner--;
        if(cdowner<0) {
            cdowner=0;
            if(cdtimer!==null) {
                clearInterval(cdtimer);
                cdtimer=null;
                countDownElem.style.width="0%";
            }
        }
        countDownElem.style.width=cdowner+"%";
    }
    function startGame() {
        if(gameOn)return;
        gameOn=true;
        if(addAliensInterval!==null){
            clearInterval(addAliensInterval);
            addAliensInterval=null;
        }
        aliens.forEach(function(alien) { alien.cleanUp(); });
        helmetbase=-5;
        helmetmax=1;
        helmetstart=10;
        aliens=[];
        for(s=0;s<1;s++){
            aliens.push( new Alien(playArea) );
        }
        gopScreen=false;
        document.getElem("#GOP").addClass("hide");
        console.log("start game!");
        if(cdtimer!==null){
            clearInterval(cdtimer);
            cdtimer=null;
            var countDownElem = document.getElem("#countdown");
            countDownElem.style.width="100%";
        }
        var countDownElem = document.getElem("#countdown");
        startGameCountDown = 10;
        if (startGameCountDownInterval) clearInterval(startGameCountDownInterval);
        startGameCountDownInterval = setInterval(function() {
            startGameCountDown--;
            if (startGameCountDown === 0) {
                clearInterval(startGameCountDownInterval);

                godmode = false;
                addAliensInterval = setInterval(function () {
                    aliens.push(new Alien(playArea));
                }, 5000);
            } else if (startGameCountDown < 0) {
                //countDownElem.clearElem();
                clearInterval(startGameCountDownInterval);
            } else {
                //countDownElem.setText(startGameCountDown);
            }
        }, 1000);
        for(var i=0;i<players.length;i++){
            if(players[i])respawn(players[i]);
        }
    }

    initializePath();
    function initializePath() {
        var width = playArea.ctx.canvas.width;
        var height = playArea.ctx.canvas.height;
        path.addPoint(0, height);
        for (var i = 0; i < points; i++) {
            path.addPoint(width / points * i, height / 2);
        }
        path.addPoint(width / points * i, height);
        path.addPoint(width, height);
        path.lineWidth(3);
        path.strokeStyle("#a4844c");
        path.usePattern('img/speesmountain.jpg');
    }
    function loadSound() {
        if (mp3url) {
            initFromMP3(mp3url);
        } else {
            navigator.getUserMedia({audio: true}, initAudio, onError);
        }
    }
    function initFromMP3(url) {
        audio = new Audio();
        audio.src = url;
        audio.addEventListener('canplay', canplay, false);
        audio.addEventListener('error',onError,false);
        audio.addEventListener('abort',onError,false);
    }
    function canplay(e){
        audio.isUrl=true;
        initAudio(audio);
        audio.play();
    }
    function initAudio(audio) {
        context = new AudioContext();
        javascriptNode = context.createScriptProcessor(256, 1, 1);
        javascriptNode.connect(context.destination);
        analyser = context.createAnalyser();
        var mediaStreamSource = audio.isUrl?context.createMediaElementSource(audio):context.createMediaStreamSource(audio);
        mediaStreamSource.connect(analyser);
        analyser.connect(context.destination);
        javascriptNode.onaudioprocess = function () {
            soundArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(soundArray);
        }
    }
    // log if an error occurs
    function onError(e) {
        console.log(e.type);
        console.error(e);
    }
    loadSound();
    playArea.addChild(path);
    path.setCoords([0, 0]);

    initNewGame();

    function initNewGame() {
        console.log("new game!");
        gameOn=false;
        gopScreen=true;
        document.getElem("#GOP").removeClass("hide");
        players.forEach(function(player) { player.cleanUp(); });
        aliens.forEach(function(alien) { alien.cleanUp(); });
        bullets.forEach(function(bullet) { bullet.cleanUp(); });
        helmetbase=-5;
        helmetmax=1;
        helmetstart=10;
        aliens=[];
        bullets=[];
        players=new Array(5);
        document.getElemAll("#ships > div").addClass("hide");

        for(s=0;s<1;s++){
            aliens.push( new Alien(playArea) );
        }
        for(s=0;s<10;s++){
            bullets.push( new Bullet(playArea) );
        }

        if (startGameCountDownInterval) clearInterval(startGameCountDownInterval);
        if (addAliensInterval!==null){
            clearInterval(addAliensInterval);
            addAliensInterval=null;
        }
    }

    function killShot(shot){
        shot.move = null;
        shot.setCoords([0, -200]);
    }
    function killAlien(alien){
        alien.active = false;
        alien.setCoords([-200, -200]);
        alien.startAnimation("fly");
        alien.isdying=false;
    }

    function killPlayer(player){
        if (godmode) return;
        console.log("player "+player.id+" died!");
        socket.emit("kill",{player:player.id,score:player.hits});
        player.ship.kill();
        player.ship=null;
    }
    function diePlayer(player){
        if(!player.dying){
            player.dying=true;
            player.ship.startAnimation("death");
        }
    }

    function killBullet(bullet){
        bullet.active=false;
        bullet.setCoords([0,-20]);
    }

    function createAliens(value){
        var newAlien=Math.rnd(1,12);
        if(newAlien>0){
            for(var s=0;s<aliens.length;s++){
                var alien=aliens[s];
                if(!alien.active){
                    var y=value/13*(newAlien);
                    var x=playArea.ctx.canvas.width+40;
                    //alien.setAngleDegrees(180);
                    alien.setCoords([x,y]);
                    //alien.rotspeed=Math.rnd(-20,20)/10;
                    alien.active=true;
                    break;
                }
            }
        }
    }

    function fireBullet(alien){
        for(var s=0;s<bullets.length;s++){
            var bullet=bullets[s];
            if(!bullet.active){
                bullet.position = alien.position.cloneVector();
                bullet.addCoords(alien.pointer.position.cloneVector());
                bullet.move = alien.pointer.rotation.cloneVector();
                bullet.rotation=alien.pointer.rotation.cloneVector();
                bullet.move.setAngle(alien.pointer.getAngle());
                bullet.move.setLength(10);
                bullet.active=true;
                break;
            }
        }
    }

    function hitsCanvas(item) {
        var x = item.getCoordObj().x;
        var y = item.getCoordObj().y;
        var p = mural.canvas.width / (points - 2);
        var index = Math.floor(x / p);
        var ppoint = path.getPoint(index);
        try {
            if (ppoint[1] < y) {
                return true;
            }
        } catch (e) {
            //console.log(sx, index);
        }
        return false;
    }

    function moveShips(game){
        players.forEach( function(player) {
            if (player && player.ship) {
                if (hitsCanvas(player.ship)) {
                    //killPlayer(player);
                    if(!player.godmode)diePlayer(player);
                    return;
                }
                if(player.dying){
                    player.ship.addCoords(alienCrash);

                }else{
                    // console.log("moving ship for player: "+player);
                    var pos = player.ship.getCoordObj();
                    // console.log(pos);
                    pos.y += (player.ship.simpleAngle / 2)*game.ticks;
                    if (pos.y < 30) {
                        pos.y = 30;
                    }
                    if (pos.y > maxHeight) {
                        pos.y = maxHeight;
                    }
                    // console.log(pos);
                    player.ship.setCoords(pos);
                }
            }
        });
    }

    function moveShots(game){
        players.forEach( function(player) {
            for(var s=0;s<player.shots.length;s++) {
                shoot=player.shots[s];
                if (shoot.move) {
                    shoot.addCoords(shoot.move.cloneVector().multiply(game.ticks));
                    var sx = shoot.position.getX();
                    if (sx > mural.canvas.width + 50) {
                        killShot(shoot);
                    } else if (hitsCanvas(shoot)){
                        killShot(shoot);
                    }
                }
            }
        });
    }

    function moveLandscape(game){
        var value=playArea.ctx.canvas.height;
        if (soundArray) {
            var loudness = 0;

            for (var j = 0; j < soundArray.length; j++) {
                loudness += soundArray[j];
            }
            if(loudness<100){
                loudness=100;
            }
            //var value ;//= playArea.ctx.canvas.height - numba * 4;
            value = playArea.ctx.canvas.height - loudness / loudScale;

            for (var i = 1; i < (path.points.length - 1 - game.ticks); i++) {
                var point = path.getPoint(i);
                path.changePoint(i, point[0], path.getPoint(i + game.ticks)[1]);
            }
            for(j=0;j<game.ticks;j++){
                try {
                    if((i+j)>=path.points.length-1)break;
                    path.changePoint(i+j, path.getPoint(i+j)[0], value);
                } catch (err) {
                    onError(err);
                }

            }
            path.relativePatternTranslate(alienSpeed.getX()*game.ticks);

        }
        return value;
    }

    function moveBullets(game){
        for(var b=0;b<bullets.length;b++){
            var bull=bullets[b];
            if(bull.active) {
                for (var i = 0; i < game.ticks; i++) {
                    bull.addCoords(bull.move);
                }
                if (bull.position.getX() < 0 || bull.position.getX() > playArea.ctx.canvas.width || bull.position.getY() < 0 || bull.position.getY() > playArea.ctx.canvas.height) {
                    killBullet(bull);
                } else{
                    for(var i=0;i<players.length;i++){
                        ship=players[i];
                        if(ship && ship.ship && ship.ship.collidesWith(bull)){
                            killBullet(bull);
                            //killPlayer(ship);
                            if(!ship.godmode)diePlayer(ship);
                            break;
                        }
                    }
                }
            }
        }
    }

    function moveAliens(game){
        for(var a=0;a<aliens.length;a++) {
            var al = aliens[a];
            if(al.active) {
                for (var i = 0; i < game.ticks; i++) {
                    al.addCoords(alienSpeed);
                    //al.setAngleDegrees(al.getAngleDegrees() + al.rotspeed);
                }
                if(al.isdying){
                    al.addCoords(alienCrash);

                }else{
                    al.pointer.setAngleDegrees(seagullShootAngles[al.animationIndex%8]);
                    players.every(function(player){
                        if(startGameCountDown===0 && player && player.ship && al.pointer.isPointingAt(player.ship,5)){
                            fireBullet(al);
                            return false;
                        }
                        return true;
                    });
                }
                if (al.position._x < -10) {
                    killAlien(al);
                } else {
                    if(!alienShotCollision(al)){
                        players.forEach( function(player) {
                            if (player && player.ship && player.ship.collidesWith(al)) {
                                killAlien(al);
                                if(!player.godmode)diePlayer(player);
                            }
                        });
                    }
                }
            }
        }
    }

    function alienShotCollision(alien){
        for (var i=0; i<players.length; i++) {
            var player=players[i];
            if (player && player.shots) {
                for (var sa = 0; sa < player.shots.length; sa++) {
                    shot = player.shots[sa];
                    if (shot.move) {
                        if (shot.collidesWith(alien)) {
                            killShot(shot);
                            if(!alien.helmet){
                                if (!godmode) player.hits++;
                                //killAlien(alien);
                                if(!alien.isdying){
                                    alien.isdying=true;
                                    alien.startAnimation("death");
                                }
                                return true;
                            }
                        }

                    }
                }
            }
        }

        return false;
    }
    function falseGod(){
        for(var i=0;i<players.length;i++){
            if(players[i] && players[i].godcounter>0){
                players[i].godcounter--;
                if(players[i].godcounter<50){
                    players[i].ship.setAlpha(players[i].godcounter%2===0?1:0.5);
                }
                if(players[i].godcounter<=0){
                    players[i].godcounter=0;
                    players[i].godmode=false;
                    players[i].ship.setAlpha(1);

                }
            }

        }
    }

    var loop = function (game) {
        if(gopScreen){
            showGopScreen(game);
        }else{
            falseGod();
            moveShips(game);
            var value=moveLandscape(game);
            moveShots(game);
            createAliens(value);
            moveAliens(game);
            moveBullets(game);
        }
    };
    function showGopScreen(game){

    }
    var game = new ScarletEngine(mural, loop);
    game.registerKeys([16,40,38]);
    game.start();
    window.game=game;
}
