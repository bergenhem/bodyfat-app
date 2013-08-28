var UserModel = require('../models/users');

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