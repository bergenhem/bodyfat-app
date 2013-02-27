var express = require('express'),
	fitness	= require('./controllers/fitness');

var app = express();

app.configure(function () {
	app.use(express.bodyParser());
});

app.get('/', fitness.sampleCall);
app.get('/bodyfat', fitness.getAllBodyFat);
app.get('/bodyfat/:id', fitness.getSingleBodyFat);
app.post('/bodyfat', fitness.addBodyFat);

app.listen(3000);
console.log('Listening on port 3000...');