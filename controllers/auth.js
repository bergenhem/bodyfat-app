var UserModel = require('../models/users');

function authenticate(name, pass, fn) {
	//this needs to change - no encryption is being done here
	UserModel.findOne({ 'userName': name }, 'userName', function(err, users) {
		if(err) {
			return fn(err);
		}
		else {
			if(users){
				return fn(null, users);
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
			req.session.error = 'Authentication Failed';
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
