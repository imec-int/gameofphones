function SoundDefender(target) {
    var url;
    var mural = new Mural(target, false, false);
    var play = mural.addPlayArea();
    var points = 128;
    var loudScale = 400;
    var path = new Poly();
    var context, javascriptNode, analyser;
    var soundArray=[];
    var shots=[];
    var maxHeight=play.ctx.canvas.height-50;
    var alienSpeed=new Vector2D(-play.ctx.canvas.width/points,0);
    var aliens=[];
    var bullets=[];
    var players=new Array(5);
    var audio;
    var shipImages = ["img/0000FF.png","img/00FF00.png","img/00FFFF.png","img/FF00FF.png","img/FFFF00.png"];

    function Player(playArea, id) {
        this.shots=[];
        this.hits=0;
        this.id=id;

        this.ship = new Sprite(shipImages[id],155,75,87,50);
        this.ship.setCollisionBox(-80,-30,60,10);
        playArea.addChild(this.ship,1);
        this.ship.setCoords([100,100]);
        this.ship.setAngle(0);
        this.ship.setScale(.5);
        this.ship.simpleAngle=0;

        for(var s=0;s<5;s++){
            var shoot=new Sprite('img/shoot3.png',145,19,140,10);
            shoot.addAnimation("bang",[0,1,2,3]);
            shoot.setCollisionBox(-120,-5,5,5);
            playArea.addChild(shoot,0);
            shoot.startAnimation("bang");
            shoot.autoAnim(true);
            shoot.setSpeed(4);
            shoot.setCoords([0,-20]);
            shoot.setScale(.5);
            this.shots.push(shoot);
        }

        this.fireShot = function(){
            if (!this.ship) return;
            for (var s = 0; s < this.shots.length; s++) {
                if (!this.shots[s].move) {
                    var shoot = this.shots[s];
                    shoot.setCoords(this.ship.getCoordObj());
                    shoot.setAngle(this.ship.getAngle());
                    shoot.move = shoot.rotation.cloneVector();
                    shoot.move.setLength(20);
                    shoot.addCoords(shoot.move);
                    shoot.addCoords(shoot.move);
                    break;
                }
            }
        }

        this.moveDown = function() {
            if (!this.ship) return;
            console.log(game.ticks);
            this.ship.simpleAngle+=5;
            if (this.ship.simpleAngle > 10) {
                this.ship.simpleAngle = 10;
            }
            this.ship.setAngleDegrees(this.ship.simpleAngle);
        }

        this.moveUp = function() {
            if (!this.ship) return;
            this.ship.simpleAngle-=5
            if (this.ship.simpleAngle < -10) {
                this.ship.simpleAngle = -5;
            }
            this.ship.setAngleDegrees(this.ship.simpleAngle);
        }

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

    // for (var i=0; i<4; i++) {
    //     players.push(new Player(play, shipImages[i]));
    // }

    for(s=0;s<1;s++){
        var alien =new Sprite('img/joeri.png',65,75,22,36);
        alien.setRotationOffsetDegrees(-180);
        //alien.setCollisionBox(-24,-27,28,25);
        alien.setCollisionBox(-13,-29,32,33);
        play.addChild(alien,2);
        alien.setCoords([0,-20]);
        alien.setScale(.5);
        alien.active=false;
        aliens.push(alien);
    }
    for(s=0;s<0;s++){
        var bullet = new Sprite('img/bullet.png', 16, 16, 8, 8);
        bullet.setCollisionBox(-4, -4, 4, 4);
        play.addChild(bullet, 3);
        bullet.setCoords([0,-10]);
        bullet.addAnimation("pulse", [0, 1, 0, 2]);
        bullet.startAnimation("pulse");
        bullet.autoAnim(true);
        bullet.setSpeed(4);
        bullet.setScale(.5);
        bullet.active=false;
        bullets.push(bullet);
    }
    //var shoot=new Sprite('img/shoot.png',145,11,140,6);
    //shoot.setCollisionBox(-120,-5,5,5);

    // sound defender nodejs backend
    var socket = io.connect("lacerta.be");
    socket.on('news', function (data) {
        socket.emit('host');
        socket.on('down',function(data){
            players[data.player].moveDown();
        });
        socket.on('up',function(data){
            players[data.player].moveUp();
        });
        socket.on('shoot',function(data){
            players[data.player].fireShot();
        });
        socket.on('live',function(data){
            console.log("live!: ");
            console.log(data);
            createPlayer(data.player);
        });
        // socket.on('admin',function(data){
        //     if(data.scale){
        //         scale=data.scale;
        //     }
        //     if(data.loudness){
        //         loudscale=data.loudness;
        //     }
        //     if(data.channels){
        //         midichannels=data.channels;
        //     }
        // });
    });

    function createPlayer(index) {
        players[index] = new Player(play, index);
    }

    initializePath();
    function initializePath() {
        var width = play.ctx.canvas.width;
        var height = play.ctx.canvas.height;
        path.addPoint(0, height);
        for (var i = 0; i < points; i++) {
            path.addPoint(width / points * i, height / 2);
        }
        path.addPoint(width / points * i, height);
        path.addPoint(width, height);
        path.fillStyle="brown";
        path.usePattern('img/craters.png');
    }
    function loadSound() {
        if (url) {
            initFromMP3(url);
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
    path.strokeStyle("#df4b26");
    path.lineWidth(3);
    play.addChild(path);
    path.setCoords([0, 0]);

    function killShot(shoot){
        shoot.move = null;
        shoot.setCoords([0, -200]);
    }
    function killAlien(alien){
        alien.active = false;
        alien.setCoords([0, -20]);
    }

    function killPlayer(player){
        socket.emit("kill",{player:player.id,score:player.hits});
        player.ship.kill();
        player.ship=null;
    }

    function killBullet(bullet){
        bullet.active=false;
        bullet.setCoords([0,-20]);
    }

    function createAliens(value){
        var newAlien=Math.rnd(-48,12);
        if(newAlien>0){
            for(var s=0;s<aliens.length;s++){
                var alien=aliens[s];
                if(!alien.active){
                    var y=value/13*(newAlien-1);
                    var x=play.ctx.canvas.width+40;
                    alien.setAngleDegrees(180);
                    alien.setCoords([x,y]);
                    alien.rotspeed=Math.rnd(-20,20)/10;
                    alien.active=true;
                    break;
                }
            }
        }
    }

    function fireBullet(alien){
        for(s=0;s<bullets.length;s++){
            var bullet=bullets[s];
            if(!bullet.active){
                bullet.position = alien.position.cloneVector();
                bullet.move = alien.rotation.cloneVector();
                bullet.move.setAngle(alien.getAbsoluteAngle());
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
            if (player.ship) {
                if (hitsCanvas(player.ship)) {
                    killPlayer(player);
                    return;
                }
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
        var value=play.ctx.canvas.height;
        if (soundArray) {
            var loudness = 0;

            for (var j = 0; j < soundArray.length; j++) {
                loudness += soundArray[j];
            }

            //var value ;//= play.ctx.canvas.height - numba * 4;
            value = play.ctx.canvas.height - loudness / loudScale;

            for (var i = 1; i < (path.points.length - 1 - game.ticks); i++) {
                var point = path.getPoint(i);
                path.changePoint(i, point[0], path.getPoint(i + game.ticks)[1]);
            }
            for(j=0;j<game.ticks;j++){
                path.changePoint(i+j, path.getPoint(i+j)[0], value);

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
                if (bull.position.getX() < 0 || bull.position.getX() > play.ctx.canvas.width || bull.position.getY() < 0 || bull.position.getY() > play.ctx.canvas.height) {
                    killBullet(bull);
                } else if (ship && ship.collidesWith(bull)) {
                    killBullet(bull);
                    killShip(ship);
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
                    al.setAngleDegrees(al.getAngleDegrees() + al.rotspeed);
                }
                // if (ship && al.position.getX() > 300 && al.isPointingAt(ship, 1)) {
                //     fireBullet(al);
                // }
                if (al.position._x < -10) {
                    killAlien(al);
                } else {
                    if(!alienShotCollision(al)){
                        players.forEach( function(player) {
                            if (player.ship && player.ship.collidesWith(al)) {
                                killAlien(al);
                                killPlayer(player);
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
                            player.hits++;
                            killShot(shot);
                            killAlien(alien);
                            return true;
                        }

                    }
                }
            }
        }

        return false;
    }

    var loop = function (game) {
        // if(ship) {
        //     shipControls(game);
        moveShips(game);
        // }
        var value=moveLandscape(game);

        moveShots(game);

        createAliens(value);
        moveAliens(game);
        moveBullets(game);
    };

    var game = new ScarletEngine(mural, loop);
    game.registerKeys([16,40,38]);
    game.start();
}
