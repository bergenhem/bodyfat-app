var db = require('../models/bodyfatitem');

exports.addBodyFat = function(req, res){
	console.log(db.getAll());
	console.log(JSON.stringify(req.body));
	return res.send("OK");
}