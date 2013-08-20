var express = require('express'),
	fitness	= require('./controllers/fitness');

var app = express();

//configure the server
app.configure(function () {
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ secret: 'SuperSecret' }));

	//define a place for our CSS and JS files
	app.use(express.static(__dirname + '/public'));

	//register our engine as .html so we can have .html pages
	app.engine('.html', require('ejs').__express);

	//define our views folder
	app.set('views', __dirname + '/views');

	//set our view engine to HTML
	app.set('view engine', 'html');


});

app.get('/', function(req, res) {
	res.render('index');
});

app.put('/login', fitness.login);
app.get('/logout', fitness.logout);
app.put('/adduser', fitness.addUser);
app.get('/bodyfat', fitness.authed, fitness.getAllBodyFat);
app.put('/bodyfat', fitness.authed, fitness.addBodyFat);
app.get('/bodyfat/:date', fitness.authed, fitness.getSingleBodyFat);
app.put('/bodyfat/:date', fitness.authed, fitness.updateBodyFat);

app.listen(3000);
console.log('Listening on port 3000...');