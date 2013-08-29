var UserModel = require('../models/users');
var encryption = require('bcrypt');

function authenticate(name, pass, fn) {
	UserModel.findOne({ 'userName': name }, function(err, users) {
		if(err) {
			return fn(err);
		}
		else {
			if(users){
				encryption.compare(pass, users.password, function(err, res) {
					if(res == true) {
						return fn(null, users);
					}
					else {
						return fn(new Error('Incorrect Password'));
					}
				});
				
			}
			else {
				return fn(new Error('No user found'));
			}
		}
	});
}

exports.login = function(req, res) {
	authenticate(req.body.userName, req.body.password, function(err, currentUser) {
		if(currentUser) {
			req.session.regenerate(function() {
				req.session.user = currentUser;
				req.session.success = 'Authenticated as ' + currentUser;
				res.writeHead(200, 'OK', {'content-type': 'application/json'});
				res.end();
			});
		}
		else {
			req.session.error = 'Authentication Failed:\n' + err;
			res.writeHead(401, 'Unauthorized', {'content-type': 'application/json'});
			res.end();
		}
	});
}

exports.logout = function(req, res) {
	req.session.destroy(function() {
		res.writeHead(200, 'OK', {'content-type': 'application/json'});
		res.end();
	});
}

exports.authed = function(req, res, next) {
	if(req.session.user) {
		//user is authenticated - let's move to the next function
		next();
	}
	else {
		req.session.error = 'Authentication Failed'
		res.writeHead(401, 'Unauthorized', {'content-type': 'application/json'});
		res.end();
	}
}
