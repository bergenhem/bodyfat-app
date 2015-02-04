var UserModel = require('../models/users');
var moment = require('moment');

var USER_NAME = "zel";

exports.addUser = function(req, res) {
	var submittedUser = req.body;

	if(submittedUser) {
		var newUser = new UserModel();

		//var userName = submittedUser.userName;
		var userName = USER_NAME;
		var userPass = submittedUser.password;

		UserModel.findOne({ 'userName': USER_NAME }, 'userName', function(err, users) {
			if(err) {
				console.log('Error in finding user by name:\n' + err);
				res.writeHead(500, 'Internal Server Error', { 'content-type' : 'application/json' });
				res.write(JSON.stringify({ message: 'Error in finding user by name.' }));
				res.end();
			}
			else {
				if(!users) { //username is unique
					//TODO: implement the ability to add users with password hashes and such
				}
				else { //username already exists
					console.log('Username "' + userName + '" already exists.');
					res.writeHead(409, 'Conflict', { 'content-type' : 'application/json' });
					res.write(JSON.stringify({ message: 'Username already exists.' }));
					res.end();
				}
			}
		});
	}
}

exports.saveSettings = function(req, res) {
	var passedSettings = req.body;
	//var currentUser = req.session.user.userName;
	var currentUser = USER_NAME;

	UserModel.findOne({ 'userName': currentUser }, function(err, foundUser) {
		if(err) {
			console.log('Error in finding user to save settings to:\n' + err);
			res.writeHead(500, 'Internal Server Error', { 'content-type' : 'application/json' });
			res.write(JSON.stringify({ message: 'Error when finding user to save settings to.' }));
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
						res.writeHead(500, 'Internal Server Error', { 'content-type' : 'application/json' });
						res.write(JSON.stringify({ message: 'Error when saving user settings.' }));
						res.end();
					}
					else {
						console.log('Successfully saving user settings for:\n' + currentUser);
						res.writeHead(200, 'OK', { 'content-type' : 'application/json' });
						res.write(JSON.stringify({ message: 'Settings saved successfully' }));
						res.end();
					}
				});
			}
			else {
				console.log('Did not find a user when saving settings');
				res.writeHead(500, 'Internal Server Error', { 'content-type' : 'application/json' });
				res.write(JSON.stringify({ message: 'Unable to find user when saving settings' }));
				res.end();
			}
		}
	});
}

exports.loadSettings = function(req, res) {
	//var currentUser = req.session.user.userName;

	var currentUser = USER_NAME;

	UserModel.findOne({ 'userName': currentUser }, function(err, foundUser) {
		if(err) {
			console.log('Error in finding user when loading settings:\n' + err);
			res.writeHead(500, 'Internal Server Error', { 'content-type' : 'application/json' });
			res.write(JSON.stringify({ message: 'Error in finding user when loading settings.' }));
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
				console.log('Loading settings for "' + currentUser + '" from the database.');
				res.writeHead(200, 'OK', { 'content-type' : 'application/json' });
				res.write(JSON.stringify(settingsToReturn));
				res.end();
			}
			else {
				console.log('Did not find a user when loading settings.');
				res.writeHead(500, 'Internal Server Error', { 'content-type' : 'application/json' });
				res.write(JSON.stringify({ message: 'No user exists with that user name.' }));
				res.end();
			}
		}
	});
}
