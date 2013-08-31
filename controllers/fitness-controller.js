var BodyFat = require('../models/bodyfat');
var UserModel = require('../models/users');
var moment = require('moment');

exports.addBodyFat = function(req, res) {
	var itemToInsert = req.body;
	var userName = req.session.user.userName;
	var createdBodyFat = new BodyFat();

	if(itemToInsert.date) {
		var formattedDate = moment(itemToInsert.date).format('YYYY-MM-DD');

		UserModel.findOne({ 'userName' : userName }, { 'bodyFat.date' : formattedDate }, function(err, userCheck) {
			if(err) {
				console.log('Error in checking for previous body fat entries: \n' + err);
				res.writeHead(500, 'Internal Server Error', {'content-type': 'application/json'});
				res.end();
			}
			else {
				if(!userCheck || userCheck.bodyFat.length == 0){
					UserModel.findOne({ 'userName': userName }, function(err, foundUser) {
						if(err) {
							console.log('Error in finding user when adding body fat:\n' + err);
								res.writeHead(500, 'Internal Server Error', {'content-type': 'application/json'});
								res.end();
						}
						else {
							if(foundUser) {
								createdBodyFat.date = formattedDate;
								if(itemToInsert.gender) createdBodyFat.gender = itemToInsert.gender;
								if(itemToInsert.age) createdBodyFat.age = itemToInsert.age;
								if(itemToInsert.unit) createdBodyFat.unit = itemToInsert.unit;
								if(itemToInsert.weight) createdBodyFat.weight = itemToInsert.weight;
								if(itemToInsert.height) createdBodyFat.height = itemToInsert.height;
								if(itemToInsert.chest) createdBodyFat.chest = itemToInsert.chest;
								if(itemToInsert.thigh) createdBodyFat.thigh = itemToInsert.thigh;
								if(itemToInsert.abs) createdBodyFat.abs = itemToInsert.abs;

								createdBodyFat.initCalculations(foundUser.height, foundUser.gender, foundUser.age);

								foundUser.bodyFat.push(createdBodyFat);

								foundUser.save(function(err, user) {
									if(err) {
										console.log('Error when saving bodyfat:\n' + err);
										res.writeHead(500, 'Internal Server Error', {'content-type': 'application/json'});
										res.end();
									}
									else {
										res.writeHead(201, 'Created', {'content-type': 'application/json'});
										res.write(JSON.stringify(foundUser));
										res.end();
									}
								});
							}
						}
					});
				}
				else {
					res.writeHead(409, 'Conflict', {'content-type': 'application/json'});
					res.end();
				}
			}

		});
	}

	//Invalid request - invalid date or no date provided
	else {
		res.writeHead(500, 'Internal Server Error', {'content-type': 'application/json'});
		res.end();
	}
}

exports.getAllBodyFat = function(req, res) {
	var userName = req.session.user.userName;

	UserModel.findOne({ 'userName': userName }, 'bodyFat', function(err, foundUser) {
		if(err) {
			console.log('Error in getting all items:\n' + err);
			res.writeHead(404, 'Not Found', {'content-type': 'application/json'});
			res.end();
		}
		else {
			if(foundUser.length == 0) {
				res.writeHead(404, 'Not Found', {'content-type': 'application/json'});
				res.end();
			}
			else {
				res.writeHead(200, 'OK', {'content-type': 'application/json'});
				res.write(JSON.stringify(foundUser));
				res.end();
			}
		}
	});
}

exports.getSingleBodyFat = function(req, res) {
	//get our date
	var passedDate = req.params.date;
	if(passedDate) {

		//format it just in case
		var formatPassedDate = moment(passedDate).format('YYYY-MM-DD');
		BodyFat.findOne({ 'date': formatPassedDate }, function(err, bodyFat) {
			if(err) {
				console.log('Error in getting single item:\n' + err);
				res.writeHead(404, 'Not Found', {'content-type': 'application/json'});
				res.end();
			}
			else {
				if(!bodyFat) {
					res.writeHead(404, 'Not Found', {'content-type': 'application/json'});
					res.end();
				}
				else {
					res.writeHead(200, 'OK', {'content-type': 'application/json'});
					res.write(JSON.stringify(bodyFat));
					res.end();
				}
			}
		});
	}
	else {
		res.writeHead(404, 'Not Found', {'content-type': 'application/json'});
		res.end();
	}
}

exports.updateBodyFat = function(req, res) {

	//get our date
	var passedDate = req.params.date;
	var itemToUpdate = req.body;

	if(passedDate) {

		//format our date just in case
		var formatPassedDate = moment(passedDate).format('YYYY-MM-DD');
		BodyFat.findOne({ 'date': formatPassedDate }, function(err, bodyFat) {
			if(err) {
				console.log('Error in updating item:\n' + err);
				res.writeHead(404, 'Not Found', {'content-type': 'application/json'});
				res.end();
			}
			else {
				if(!bodyFat) {
					res.writeHead(404, 'Not Found', {'content-type': 'application/json'});
					res.end();
				}
				else {

					//update all of our fields if they exist
					if(itemToUpdate.gender) bodyFat.gender = itemToUpdate.gender;
					if(itemToUpdate.age) bodyFat.age = itemToUpdate.age;
					if(itemToUpdate.unit) bodyFat.unit = itemToUpdate.unit;
					if(itemToUpdate.weight) bodyFat.weight = itemToUpdate.weight;
					if(itemToUpdate.height) bodyFat.height = itemToUpdate.height;
					if(itemToUpdate.chest) bodyFat.weight = itemToUpdate.chest;
					if(itemToUpdate.thigh) bodyFat.thigh = itemToUpdate.thigh;
					if(itemToUpdate.abs) bodyFat.abs = itemToUpdate.abs;

					//do all the calculations
					createdBodyFat.initCalculations();

					bodyFat.save(function(err, bodyFat) {
						if(err) {
							console.log("Error when updating:\n" + err);
							res.writeHead(500, 'Internal Server Error', {'content-type': 'application/json'});
							res.end();
						}
						else {
							res.writeHead(200, 'OK', {'content-type': 'application/json'});
							res.write(JSON.stringify(bodyFat));
							res.end();
						}
					});
				}
			}
		});
	}

	//Invalid request - invalid date or no date provided
	else {
		res.writeHead(404, 'Not Found', {'content-type': 'application/json'});
		res.end();
	}
}