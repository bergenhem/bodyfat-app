var express = require('express'),
	fitness		= require('./controllers/fitness');

var app = express();

app.configure(function () {
	app.use(express.bodyParser());
});

app.post('/bodyfat', fitness.addBodyFat);

app.listen(3000);
console.log('Listening on port 3000...');