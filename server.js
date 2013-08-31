var express 			= require('express'),
	fitnessController	= require('./controllers/fitness-controller'),
	authController 		= require('./controllers/auth-controller'),
	userController		= require('./controllers/user-controller'),
	mongoose 			= require('mongoose'),
	mongoStore 			= require('connect-mongo')(express);

mongoose.connect('mongodb://localhost/testfitness');

var app = express();

//configure the server
app.configure(function () {
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ 
		cookie: {
			maxAge: 1000 * 60 * 60 * 24 * 3 //session lasts for 3 days
		},
		secret: 'sup3rbl4dd3rw4rr10r',
		store: new mongoStore({ mongoose_connection: mongoose.connections[0] })
	}));

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
app.put('/settings', authController.authed, userController.saveSettings);
app.get('/settings', authController.authed, userController.loadSettings);
app.get('/bodyfat', authController.authed, fitnessController.getAllBodyFat);
app.put('/bodyfat', authController.authed, fitnessController.addBodyFat);
app.get('/bodyfat/:date', authController.authed, fitnessController.getSingleBodyFat);
app.put('/bodyfat/:date', authController.authed, fitnessController.updateSingleBodyFat);

app.listen(3000);
console.log('Listening on port 3000...');