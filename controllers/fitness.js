var bodyFatModel = require('../models/bodyfatitem');

exports.addBodyFat = function(req, res){
	var test = bodyFatModel.getSampleData()[0];
	console.log("Test Var: " + JSON.stringify(test));
	console.log("BF%: " + bodyFatModel.calculateBodyFat(test));
	//console.log("Body: " + JSON.stringify(req.body));


	console.log(req.body);

	bodyFatModel.saveBodyFat(req.body);


	return res.send("OK");
}

//res.writeHead(200, {'Content-Type': 'application/json'});
//Single Object - POST - res.write(JSON.stringify({Object}));
//Multiple Objects - GET - res.write(JSON.stringify([Object Array]));
//res.end();
//Alternative -> res.end(JSON.stringify({Object}));

//res.writeHead(200, "OK", {'Content-Type': 'text/html'});
//res.write('<html><head><title>Post Data</title></head><body>{Data}</body></html>');