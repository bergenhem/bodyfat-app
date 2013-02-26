var bodyFatModel = require('../models/bodyfatitem');

exports.addBodyFat = function(req, res){
	var test = bodyFatModel.getSampleData()[0];
	console.log("Test Var: " + JSON.stringify(test));
	console.log("BF%: " + bodyFatModel.calculateBodyFat(test));
	console.log("Body: " + JSON.stringify(req.body));
	return res.send("OK");
}