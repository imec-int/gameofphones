Sound Defender
=======

Defender-like game, where enemies are rendered based on MIDI data, landscape based on audio,
and where the planes are controlled remotely with a smartphone or tablet.

Installation
=======

* Install the backend server from https://github.com/myster0n/sound-defender-backend
```
  git clone https://github.com/myster0n/sound-defender-backend.git
  cd sound-defender-backend
  npm install
  nodejs index.js
```

* Check out these static files and put them on a web server
```
  git clone https://github.com/LennartC/sound-defender.git
```

* open host.html and index.html in a text editor, and change the location of socket.io:

  <pre>
  ...
  &lt;script src="http://lacerta.be/socket.io/socket.io.js"&gt;&lt;/script&gt;
  ...
  var socket = io.connect('http://lacerta.be');
  </pre>

* In host.html, change the location of the MIDI api:

  <pre>
  &lt;script src="http://mixmini.mixlab.be:3000/javascripts/api.js" type='text/javascript'&gt;&lt;/script&gt;
  <pre>

* Plug in the audio cable on your desktop pc, open your desktop browser and go to http://your_web_server/sound-defender/host.html

* With your smartphone, go to http://your_web_server/sound-defender/ and if a plane is assigned to you, start playing! 
