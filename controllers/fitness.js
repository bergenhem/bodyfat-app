var BodyFat = require('../models/bodyfat');

exports.addBodyFat = function(req, res) {
	var itemToInsert = req.body;

	var createdBodyFat = new BodyFat();

	if(itemToInsert.date) createdBodyFat.date = itemToInsert.date;
	if(itemToInsert.gender) createdBodyFat.gender = itemToInsert.gender;
	if(itemToInsert.age) createdBodyFat.age = itemToInsert.age;
	if(itemToInsert.unit) createdBodyFat.unit = itemToInsert.unit;
	if(itemToInsert.weight) createdBodyFat.weight = itemToInsert.chest;
	if(itemToInsert.chest) createdBodyFat.chest = itemToInsert.chest;
	if(itemToInsert.thigh) createdBodyFat.thigh = itemToInsert.thigh;
	if(itemToInsert.abs) createdBodyFat.abs = itemToInsert.abs;

	createdBodyFat.calcBodyFat();

	createdBodyFat.save(function(err, bodyFat) {
		if(err) {
			console.log("Error when saving:\n" + err);
			res.writeHead(500, "Internal Server Error", {'content-type': 'application/json'});
			res.end();
		}
		else {
			res.writeHead(201, "Created", {'content-type': 'application/json'});
			res.write(JSON.stringify(createdBodyFat));
			res.end();
		}
	});
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