var UserModel = require('../models/users');
//var encryption = require('bcrypt');

// Temporary to get the app to work with jsut a single user
var USER_NAME = "zel";

function authenticate(name, passedPass, fn) {
	UserModel.findOne({ 'userName': USER_NAME }, function(err, user) {
		if(err) {
			return fn(err);
		}
		else {
			if(users){
				// encryption.compare(passedPass, users.password, function(err, res) {
				// 	if(res == true) {
				// 		return fn(null, users);
				// 	}
				// 	else {
				// 		return fn(new Error('Incorrect Password'));
				// 	}
				// });

        // temporary while we only work with a single user
				return fn(null, user);

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

				console.log('Successfully logged in.')
				res.writeHead(200, 'OK', { 'content-type' : 'application/json' });
				res.write(JSON.stringify({ message: 'Successfully logged in.' }));
				res.end();
			});
		}
		else {
			console.log('Unable to log in.');
			req.session.error = 'Authentication Failed:\n' + err;
			res.writeHead(401, 'Unauthorized', { 'content-type' : 'application/json' });
			res.write(JSON.stringify({ message: 'Unable to log in.' }));
			res.end();
		}
	});
}

exports.logout = function(req, res) {
	req.session.destroy(function() {
		console.log('Sucessfully logged out');
		res.writeHead(200, 'OK', { 'content-type' : 'application/json' });
		res.write(JSON.stringify({ message: 'Successfully logged out.' }));
		res.end();
	});
}

exports.authed = function(req, res, next) {

	// Temporary to get the app to work with just a single user
	next();

	// if(req.session.user) {
	// 	//user is authenticated - let's move to the next function
	// 	next();
	// }
	// else {
	// 	req.session.error = 'Authentication Failed'
	// 	res.writeHead(401, 'Unauthorized', {'content-type': 'application/json'});
	// 	res.end();
	// }
}
