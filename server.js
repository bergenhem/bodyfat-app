var express 			= require('express'),
	fitnessController	= require('./controllers/fitness-controller'),
	authController 		= require('./controllers/auth-controller'),
	userController		= require('./controllers/user-controller');

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

app.put('/login', authController.login);
app.get('/logout', authController.logout);
app.put('/adduser', userController.addUser);
app.put('/saveSettings', authController.authed, userController.saveSettings)
app.get('/bodyfat', authController.authed, fitnessController.getAllBodyFat);
app.put('/bodyfat', authController.authed, fitnessController.addBodyFat);
app.get('/bodyfat/:date', authController.authed, fitnessController.getSingleBodyFat);
app.put('/bodyfat/:date', authController.authed, fitnessController.updateBodyFat);

app.listen(3000);
console.log('Listening on port 3000...');