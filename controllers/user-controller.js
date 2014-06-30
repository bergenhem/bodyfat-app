var UserModel = require('../models/users');
var encryption = require('bcrypt');
var moment = require('moment');

exports.addUser = function(req, res) {
	if(req.body.userName && req.body.password) {

		var submittedUser = {
			userName: req.body.userName,
			password: req.body.password
		};

		if(submittedUser) {
			var newUser = new UserModel();

			var userName = submittedUser.userName;
			var userPass = submittedUser.password;

			UserModel.findOne({ 'userName': userName }, 'userName', function(err, users) {
				if(err) {
					console.log('Error in finding unique user name:\n' + err);
					res.writeHead(500, 'Internal Server Error', { 'content-type': 'application/json' });
					res.end();
				}
				else {
					if(!users) { //username is unique

						encryption.genSalt(10, function(err, salt) {
							if(err) {
								console.log('Error when generating salt\n');
							}
							else {
								encryption.hash(userPass, salt, function(err, hash) {
									if(submittedUser.userName) newUser.userName = userName;
									if(submittedUser.password) newUser.password = hash;
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
											});
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
}

exports.saveSettings = function(req, res) {
	var passedSettings = req.body;
	var currentUser = req.session.user.userName;

	UserModel.findOne({ 'userName': userName }, function(err, foundUser) {
		if(err) {
			console.log('Errr in finding user to save settings to:\n' + err);
			res.writeHead(500, 'Internal Server Error', { 'content-type': 'application/json' });
			res.end();
		}
		else {
			if(foundUser) {
				if(passedSettings.unit) foundUser.unit = passedSettings.unit;
				if(passedSettings.age) foundUser.age = passedSettings.age;
				if(passedSettings.height) foundUser.height = passedSettings.height;
				if(passedSettings.gender) foundUser.gender = passedSettings.gender;
				if(passedSettings.calipers) foundUser.calipers = passedSettings.calipers;

				foundUser.save(function(err, user) {
					if(err) {
						console.log('Error when saving user settings:\n' + err);
						res.writeHead(500, 'Internal Server Error', {'content-type': 'application/json'});
						res.end();
					}
					else {
						res.writeHead(200, 'OK', {'content-type': 'application/json'});
						res.end();
					}
				});
			}
			else {
				console.log('Did not find a user when saving settings');
				res.writeHead(500, 'Internal Server Error', { 'content-type': 'application/json' });
				res.end();
			}
		}
	});
}

exports.loadSettings = function(req, res) {
	var currentUser = req.session.user.userName;

	UserModel.findOne({ 'userName': currentUser }, function(err, foundUser) {
		if(err) {
			console.log('Error in finding user when loading settings:\n' + err);
			res.writeHead(500, 'Internal Server Error', { 'content-type': 'application/json' });
			res.end();
		}
		else {
			if(foundUser) {
				var settingsToReturn = {
					unit : foundUser.unit,
					age : foundUser.age,
					height : foundUser.height,
					gender : foundUser.gender,
					calipers : foundUser.calipers
				}

				res.writeHead(200, 'OK', {'content-type': 'application/json'});
				res.write(JSON.stringify(settingsToReturn));
				res.end();
			}
			else {
				console.log('Did not find a user when loading settings');
				res.writeHead(500, 'Internal Server Error', { 'content-type': 'application/json' });
				res.end();
			}
		}
	});
}