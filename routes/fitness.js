exports.addBodyFat = function(req, res){
	console.log(JSON.stringify(req.body));
	console.log('req.body.testField', req.body['testField']);
	var sample = { "sampleField" : "worked" };
	return res.send("OK");
}