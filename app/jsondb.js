var fs = require('fs');
var path = require('path');


var FILE = path.join( __dirname, "gamedata.json");

var isSaving = false;


function load (callback){
	fs.exists(FILE, function (exists) {
		if(!exists) return callback(null, null); //null object

		fs.readFile(FILE , 'utf8', function (err, data) {
			if (err) return callback(err);
			var the_data = JSON.parse(data);
			if(callback) callback(null, the_data);
			return;
		});
	});
}


function save (the_data){
	if(isSaving)
		return; //anders krijgen we corrupte files

	// console.log("> saving");
	isSaving = true;
	fs.writeFile( FILE, JSON.stringify(the_data), function (err) {
		if(err) console.log(err);
		isSaving = false;
	});
}



exports.load = load;
exports.save = save;
