/**
 * TouchControls.js
 * Part of ScarletEngine
 */

var TouchControls=(function(){
    window.addEventListener('load', function() {setTimeout(function() { window.scrollTo(0, 1); }, 50);}, false);
    function TouchControls(){
        this.winwidth=window.innerWidth;
        this.winheight=window.innerHeight;
        this.elements=[];
        this.testTouch=null;
        this.callback=null;
        this.looper=null;
    }
    TouchControls.JOYSTICK=0;
    TouchControls.BUTTON=1;
    TouchControls.CONTINUOUSBUTTON=2;
    TouchControls.prototype.addElement=function(name,elem,type){
        console.log(elem);
        var e={name:name,element:elem,type:type,x1:0,y1:0,x2:0,y2:0};
        if(type===TouchControls.BUTTON){
            e.fire=false;
            e.previous=false;
        }
        this.elements.push(e);
        this.calcElement(this.elements.length-1);
    };
    TouchControls.prototype.isElement=function(name){
        for(var i=0;i<this.elements.length;i++){
            var el=this.elements[i];
            if(el.name===name){
                if(el.type===TouchControls.BUTTON){
                    if(el.fire===el.previous){
                        return false;
                    }else{
                        this.elements[i].previous=el.fire;
                        return el.fire;
                    }
                }else if(el.type===TouchControls.CONTINUOUSBUTTON){
                    var value=el.fire;
                    this.elements[i].fire=false;
                    return value;
                }else if(el.type===TouchControls.JOYSTICK){
                    return el.touched;
                }
            }
        }
        return false;
    };
    TouchControls.prototype.calcElement=function(index){
        var el=this.elements[index];
        if( el.element instanceof HTMLElement){
            var offset=TouchControls.getOffset(el.element);
            el.x1=offset.left;
            el.y1=offset.top;
            el.x2=offset.left+el.element.offsetWidth;
            el.y2=offset.top+el.element.offsetHeight;
            console.log(el);
        }
    };
    TouchControls.prototype.calcElements=function(){
        for(var i=0;i<this.elements.length;i++){
            this.calcElement(i);
        }
    };
    TouchControls.prototype.start=function(callback){
        this.calcElements();
        this.winwidth=window.innerWidth;
        this.winheight=window.innerHeight;
        this.bindedcontrols=this.controls.bind(this);
        this.bindedorientation=this.doOnOrientationChange.bind(this);
        document.addEventListener('touchstart',this.bindedcontrols,false);
        document.addEventListener('touchend',this.bindedcontrols,false);
        document.addEventListener('touchmove',this.bindedcontrols,false);
        document.addEventListener('touchenter',this.bindedcontrols,false);
        document.addEventListener('touchleave',this.bindedcontrols,false);
        document.addEventListener('touchcancel',this.bindedcontrols,false);
        window.addEventListener('resize', this.bindedorientation,false);
        this.callback=callback;
        this.looper=setInterval(this.detectionLoop.bind(this),16);
    };

    TouchControls.prototype.stop=function(){
        document.removeEventListener('touchstart',this.bindedcontrols,false);
        document.removeEventListener('touchend',this.bindedcontrols,false);
        document.removeEventListener('touchmove',this.bindedcontrols,false);
        document.removeEventListener('touchenter',this.bindedcontrols,false);
        document.removeEventListener('touchleave',this.bindedcontrols,false);
        document.removeEventListener('touchcancel',this.bindedcontrols,false);
        window.removeEventListener('resize', this.bindedorientation,false);
        if(this.looper!==null){
            clearInterval(this.looper);
            this.looper=null;
        }

    };

    TouchControls.prototype.detectionLoop=function(){
        var el,k=null;
        if(this.testTouch!==null){
            for(var i=0;i<this.testTouch.length;i++){
                var touch=this.testTouch[i];
                for(var j=0;j<this.elements.length;j++){
                    el=this.elements[j];
                    if(touch.clientY>el.y1 && touch.clientY<el.y2 && touch.clientX>el.x1 && touch.clientX<el.x2){
                        if(el.type===TouchControls.BUTTON){
                            this.elements[j].update={fire:true};
                        }else if(el.type===TouchControls.CONTINUOUSBUTTON){
                            this.elements[j].update={fire:true};
                        }else if(el.type===TouchControls.JOYSTICK){
                            this.elements[j].update=el.update||[];
                            this.elements[j].update.push({x:touch.clientX,y:touch.clientY});
                        }
                    }
                }
            }
            for(k=0;k<this.elements.length;k++){
                el=this.elements[k];
                if(el.type===TouchControls.BUTTON){
                    this.elements[k].fire = el.update.fire;
                }else if(el.type===TouchControls.CONTINUOUSBUTTON){
                    if(el.update){
                        this.elements[k].fire=true;
                    }
                }else if(el.type===TouchControls.JOYSTICK){
                    if(el.update){
                        var x=0;
                        var y=0;
                        for(var l=0;l<el.update.length;l++){
                            x+=el.update[l].x;
                            y+=el.update[l].y;
                        }
                        x/=el.update.length;
                        y/=el.update.length;

                        x-=el.x1;
                        y-=el.y1;
                        x=(x/(el.x2-el.x1)*200)-100;
                        y=(y/(el.y2-el.y1)*200)-100;
                        this.elements[k].touched={x:x,y:-y};
                    }else{
                        this.elements[k].touched=false;
                    }
                }
                this.elements[k].update=false;
            }
        }else{
            for(k=0;k<this.elements.length;k++){
                el=this.elements[k];
                switch (el.type){
                    case TouchControls.BUTTON:
                    case TouchControls.CONTINUOUSBUTTON:
                        this.elements[k].fire=false;
                        continue;
                    case TouchControls.JOYSTICK:
                        this.elements[k].touched=false;

                }
            }
        }
        if(this.callback!==null && typeof this.callback === "function"){
            this.callback();
        }
    };

    TouchControls.prototype.controls=function(event){
        if(event.touches.length>0){
            this.testTouch=event.touches;
        }else{
            this.testTouch=null;
        }
        event.preventDefault();
    };
    TouchControls.prototype.doOnOrientationChange=function(){
        console.log("OrientationChange");
        this.winwidth=window.innerWidth;
        this.winheight=window.innerHeight;
        this.calcElements();
    };

    TouchControls.getOffset=function( el ) {
        var _x = 0;
        var _y = 0;
        while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
            _x += el.offsetLeft - el.scrollLeft;
            _y += el.offsetTop - el.scrollTop;
            el = el.offsetParent;
        }
        return { top: _y, left: _x };
    };

    return TouchControls;
})();