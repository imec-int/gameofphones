var path = require('path');
var fs = require("fs");

module.exports = function() {
	console.log.apply(this, arguments);

	var now = new Date();
	var filepath = path.join(__dirname, "log.txt");

	var str = now.toString() + ': ';
	for (var i = 0; i < arguments.length; i++) {

		if (typeof arguments == 'string' || arguments instanceof String) {
			str += arguments[i] + '\n';
		}else{
			str += JSON.stringify(arguments[i]) + '\n';
		}

	}

	fs.appendFile(filepath, str, function (err) {});
};