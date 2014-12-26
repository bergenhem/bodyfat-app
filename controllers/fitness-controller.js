var BodyFat = require('../models/bodyfat');
var UserModel = require('../models/users');
var moment = require('moment');

var USER_NAME = 'zel';

exports.addBodyFat = function(req, res) {
	var itemToInsert = req.body;
	//var userName = req.session.user.userName;

	var userName = USER_NAME;

	var createdBodyFat = new BodyFat();

	if(itemToInsert.date) {
		var formattedDate = moment(itemToInsert.date).format('YYYY-MM-DD');

		UserModel.findOne({ 'userName' : userName , 'bodyFat.date' : formattedDate }, function(err, userCheck) {
			if(err) {
				console.log('Error when checking for previous body fat entries: \n' + err);
				res.writeHead(500, 'Internal Server Error', { 'content-type' : 'application/json' });
				res.write(JSON.stringify({ message: 'Error when checking for previous body fat entries.' }));
				res.end();
			}
			else {
				if(!userCheck) {
					UserModel.findOne({ 'userName': userName }, function(err, foundUser) {
						if(err) {
							console.log('Error in finding user when adding body fat:\n' + err);
								res.writeHead(500, 'Internal Server Error', { 'content-type' : 'application/json' });
								res.write(JSON.stringify({ message: 'Error in finding user when adding body fat.' }));
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
										console.log('Error when saving body fat values:\n' + err);
										res.writeHead(500, 'Internal Server Error', { 'content-type' : 'application/json' });
										res.write(JSON.stringify({ message: 'Error when saving body fat values.' }));
										res.end();
									}
									else {
										console.log('Successfully added body fat values to database.');
										res.writeHead(201, 'Created', { 'content-type' : 'application/json' });
										res.write(JSON.stringify(foundUser));
										res.end();
									}
								});
							}
						}
					});
				}
				else {
					console.log('Attempted to add a new body fat entry where one already existed.');
					res.writeHead(409, 'Conflict', { 'content-type' : 'application/json' });
					res.write(JSON.stringify({ message: 'Attempted to add a new body fat entry where one already existed.' }));
					res.end();
				}
			}

		});
	}

	//Invalid request - invalid date or no date provided
	else {
		console.log('Invalid request. Invalid date or no date provided in request.')
		res.writeHead(500, 'Internal Server Error', { 'content-type' : 'application/json' });
		res.write(JSON.stringify({ message: 'Invalid request. Invalid date or no date provided in request.' }));
		res.end();
	}
}

exports.getAllBodyFat = function(req, res) {
	//var userName = req.session.user.userName;
	var userName = USER_NAME;

	UserModel.findOne({ 'userName': userName }, 'bodyFat', function(err, foundUser) {
		if(err) {
			console.log('Error in getting all body fat entries:\n' + err);
			res.writeHead(404, 'Not Found', { 'content-type' : 'application/json' });
			res.write(JSON.stringify({ message: 'Error in getting all body fat entries.' }));
			res.end();
		}
		else {
			if(foundUser.length == 0) {
				console.log('User not found when retrieving all body fat entries.')
				res.writeHead(404, 'Not Found', { 'content-type' : 'application/json' });
				res.write(JSON.stringify({ message: 'User not found when retrieving all body fat entries.' }));
				res.end();
			}
			else {
				console.log('Retrieving all body fat entries for "' + userName + '".');
				res.writeHead(200, 'OK', { 'content-type' : 'application/json' });
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
		UserModel.findOne({ 'userName' : userName }, { 'bodyFat' : { $elemMatch : { 'date' : formatPassedDate } } }, function(err, returnedBodyFat) {
			if(err) {
				console.log('Error in getting single item:\n' + err);
				res.writeHead(404, 'Not Found', { 'content-type' : 'application/json' });
				res.write(JSON.stringify({ message: 'Error in getting single item.' }));
				res.end();
			}
			else {
				if(!returnedBodyFat || returnedBodyFat.bodyFat == undefined) {
					console.log('Did not find a body fat entry with the associated date');
					res.writeHead(404, 'Not Found', { 'content-type' : 'application/json' });
					res.write(JSON.stringify({ message: 'Did not find a body fat e ntry with the associated date.' }));
					res.end();
				}
				else {
					console.log('Returning a single body fat entry.');
					res.writeHead(200, 'OK', { 'content-type' : 'application/json' });
					res.write(JSON.stringify(returnedBodyFat));
					res.end();
				}
			}
		});
	}
	else {
		console.log('Invalid request. Either an invalid date or no date was passed.');
		res.writeHead(404, 'Not Found', { 'content-type' : 'application/json' });
		res.write(JSON.stringify({ message: 'Invalid date. Either an invalid date or no date was passed.' }));
		res.end();
	}
}

exports.updateSingleBodyFat = function(req, res) {
	var itemToUpdate = req.body;
	//var userName = req.session.user.userName;

	var userName = USER_NAME;

	if(itemToInsert.date) {
		var formattedDate = moment(itemToInsert.date).format('YYYY-MM-DD');

		UserModel.findOne({ 'userName' : userName }, { 'bodyFat' : { $elemMatch : { 'date' : formatPassedDate } } }, function(err, returnedBodyFat) {
			if(err) {
				console.log('Error in checking for previous body fat entries: \n' + err);
				res.writeHead(500, 'Internal Server Error', { 'content-type' : 'application/json' });
				res.write(JSON.stringify({ message: 'Error in checking for previous body fat entries.' }));
				res.end();
			}
			else {
				if(!returnedBodyFat || returnedBodyFat.bodyFat == undefined) {
					  console.log('No body fat entry found for the given date.')
						res.writeHead(404, 'Not Found', { 'content-type' : 'application/json' });
						res.write(JSON.stringify({ message: 'No body fat entry found for the given date.' }));
						res.end();
				}
				else {
					UserModel.findOne({ 'userName': userName }, function(err, foundUser) {
						if(err) {
							console.log('Error in finding user when updating single body fat entry:\n' + err);
							res.writeHead(404, 'Not Found', { 'content-type' : 'application/json' });
							res.write(JSON.stringify({ message: 'Error in finding user when updating single body fat entry.' }));
							res.end();
						}
						else {
							returnedBodyFat.bodyFat[0] = formattedDate;
							if(itemToInsert.gender) returnedBodyFat.bodyFat[0].gender = itemToInsert.gender;
							if(itemToInsert.age) returnedBodyFat.bodyFat[0].age = itemToInsert.age;
							if(itemToInsert.unit) returnedBodyFat.bodyFat[0].unit = itemToInsert.unit;
							if(itemToInsert.weight) returnedBodyFat.bodyFat[0].weight = itemToInsert.weight;
							if(itemToInsert.height) returnedBodyFat.bodyFat[0].height = itemToInsert.height;
							if(itemToInsert.chest) returnedBodyFat.bodyFat[0].chest = itemToInsert.chest;
							if(itemToInsert.thigh) returnedBodyFat.bodyFat[0].thigh = itemToInsert.thigh;
							if(itemToInsert.abs) returnedBodyFat.bodyFat[0].abs = itemToInsert.abs;

							returnedBodyFat.bodyFat[0].initCalculations(foundUser.height, foundUser.gender, foundUser.age);

							foundUser.save(function(err, user) {
								if(err) {
									console.log('Error when saving updated body fat entry:\n' + err);
									res.writeHead(500, 'Internal Server Error', { 'content-type' : 'application/json' });
									res.write(JSON.stringify({ message: 'Error when saving updated body fat entry.' }));
									res.end();
								}
								else {
									console.log('Sucessfully updated single body fat entry');
									res.writeHead(201, 'Created', { 'content-type' : 'application/json' });
									res.write(JSON.stringify(foundUser));
									res.end();
								}
							});
						}
					});
				}
			}

		});
	}

	//Invalid request - invalid date or no date provided
	else {
		console.log('Invalid request. Either an invalid date or no date was passed.')
		res.writeHead(404, 'Not Found', { 'content-type' : 'application/json' });
		res.write(JSON.stringify({ message: 'Invalid request. Either an invalid date or no date was passed.' }));
		res.end();
	}
}
