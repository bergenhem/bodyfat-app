var bodyFatModel = require('../models/bodyfatitem');

exports.addBodyFat = function(req, res) {
	var itemToInsert = req.body;

	var updatedItem = bodyFatModel.updateBodyFatField(itemToInsert);

	bodyFatModel.saveBodyFat(updatedItem);

	res.writeHead(201, "Created", {'content-type': 'application/json'});
	res.write(JSON.stringify(updatedItem));
	res.end();
}

exports.getAllBodyFat = function(req, res) {
	var itemsToReturn = bodyFatModel.getSampleData();
	
	res.writeHead(200, "OK", {'content-type': 'application/json'});
	res.write(JSON.stringify(itemsToReturn));
	res.end();
}

//res.writeHead(200, {'Content-Type': 'application/json'});
//Single Object - POST - res.write(JSON.stringify({Object}));
//Multiple Objects - GET - res.write(JSON.stringify([Object Array]));
//res.end();
//Alternative -> res.end(JSON.stringify({Object}));

//res.writeHead(200, "OK", {'Content-Type': 'text/html'});
//res.write('<html><head><title>Post Data</title></head><body>{Data}</body></html>');