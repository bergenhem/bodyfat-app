var BodyFat = require('../models/bodyfat');
var UserModel = require('../models/users');
var moment = require('moment');

exports.addUser = function(req, res) {
	var submittedUser = req.body;

	if(submittedUser) {
		var newUser = new UserModel();

		var userName = submittedUser.userName;

		UserModel.findOne({ 'userName': userName }, 'userName', function(err, users) {
			if(err) {
				console.log('Error in finding unique user name:\n' + err);
				res.writeHead(500, 'Internal Server Error', { 'content-type': 'application/json' });
				res.end();
			}
			else {
				if(!users) { //username is unique
					if(submittedUser.userName) newUser.userName = submittedUser.userName;
					if(submittedUser.gender) newUser.gender = submittedUser.gender;
					if(submittedUser.dateOfBirth) newUser.dateOfBirth = moment(submittedUser.dateOfBirth).format('YYYY-MM-DD');
					if(submittedUser.age) newUser.age = submittedUser.age;
					if(submittedUser.height) newUser.height = submittedUser.height;
					if(submittedUser.unit) newUser.unit = submittedUser.unit;
					if(submittedUser.calipers) newUser.calipers = submittedUser.calipers;

					newUser.save(function(err, user) {
						if(err) {
							console.log('Error when saving user:\n' + err);
							res.writeHead(500, 'Internal Server Error', {'content-type': 'application/json'});
							res.end();
						}
						else {
							res.writeHead(201, 'Created', {'content-type': 'application/json'});
							res.write(JSON.stringify(newUser));
							res.end();
						}
					});
				}
				else { //username already exists
					res.writeHead(409, 'Conflict', {'content-type': 'application/json'});
					res.end();
				}
			}
		});
	}
}

exports.addBodyFat = function(req, res) {
	var itemToInsert = req.body;

	var createdBodyFat = new BodyFat();

	if(itemToInsert.date) {
		var formatString = moment(itemToInsert.date).format('YYYY-MM-DD');
		BodyFat.findOne({ 'date': formatString }, 'date', function(err, bodyFat) {
			if(err) {
				console.log('Error in query:\n' + err);
				res.writeHead(500, 'Internal Server Error', {'content-type': 'application/json'});
				res.end();
			}
			else {
				//Did not find
				if(!bodyFat) {
					createdBodyFat.date = formatString;
					if(itemToInsert.gender) createdBodyFat.gender = itemToInsert.gender;
					if(itemToInsert.age) createdBodyFat.age = itemToInsert.age;
					if(itemToInsert.unit) createdBodyFat.unit = itemToInsert.unit;
					if(itemToInsert.weight) createdBodyFat.weight = itemToInsert.weight;
					if(itemToInsert.height) createdBodyFat.height = itemToInsert.height;
					if(itemToInsert.chest) createdBodyFat.chest = itemToInsert.chest;
					if(itemToInsert.thigh) createdBodyFat.thigh = itemToInsert.thigh;
					if(itemToInsert.abs) createdBodyFat.abs = itemToInsert.abs;

					//do all the calculations
					createdBodyFat.initCalculations();

					createdBodyFat.save(function(err, bodyFat) {
						if(err) {
							console.log("Error when saving:\n" + err);
							res.writeHead(500, 'Internal Server Error', {'content-type': 'application/json'});
							res.end();
						}
						else {
							res.writeHead(201, 'Created', {'Location': '/bodyfat/' + formatString, 'content-type': 'application/json'});
							res.write(JSON.stringify(createdBodyFat));
							res.end();
						}
					});
				}
				//Item found, return 409 to indicate it already exists
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
	var currentUser = req.params.userName;
	if(currentUser) {
		UserModel.find({ }, function(err, userModel) {
			if(err) {
				console.log('Error in getting all items:\n' + err);
				res.writeHead(404, 'Not Found', {'content-type': 'application/json'});
				res.end();
			}
			else {
				if(userModel.length == 0) {
					res.writeHead(404, 'Not Found', {'content-type': 'application/json'});
					res.end();
				}
				else {
					res.writeHead(200, 'OK', {'content-type': 'application/json'});
					res.write(JSON.stringify(userModel));
					res.end();
				}
			}
		});
	}
}

exports.getSingleBodyFat = function(req, res) {
	console.log('Single Body Fat Called');
	console.log('Parameters: ' + req.params);
	console.log('Date: '+ req.params.date);
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