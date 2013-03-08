var bodyFatModel = require('../models/bodyfatitem');
var BodyFat = require('../models/bodyfat');

exports.sampleCall = function(req, res) {
	var test = new BodyFat({ age: 24, gender: 'male', chest: 15, thigh: 5, abs: 20 });

	test.calcBodyFat();
	test.test();

	res.end();
}

exports.addBodyFat = function(req, res) {
	var itemToInsert = req.body;

	var updatedItem = bodyFatModel.addId(itemToInsert);

	updatedItem = bodyFatModel.updateBodyFatField(updatedItem);

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

exports.getSingleBodyFat = function(req, res) {
	var id = req.params.id;
	console.log('Find Single by ID: ' + id);

	res.writeHead(200, "OK", {'content-type': 'application/json'});
	res.write(JSON.stringify(bodyFatModel.getSampleData()[0]));
	res.end();
}

exports.updateBodyFat = function(req, res) {
	var id = req.params.id;
	var itemToUpdate = req.body;

	res.writeHead(200, "OK", {'content-type': 'application/json'});
	res.end();
}