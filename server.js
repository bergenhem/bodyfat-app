var express           = require('express'),
    bodyParser        = require('body-parser'),
    mongoose 			    = require('mongoose'),
    fitnessController	= require('./controllers/fitness-controller'),
    authController 		= require('./controllers/auth-controller'),
    userController		= require('./controllers/user-controller');

mongoose.connect('mongodb://localhost/testfitness');

var app = express();

//configure the server

// Accept application/json
app.use(bodyParser.json());

//accept xml
app.use(bodyParser.urlencoded({
  extended: true
}));

//define a place for our CSS and JS files
app.use(express.static(__dirname + '/public'));

//register our engine as .html so we can have .html pages
app.engine('.html', require('ejs').__express);

//define our views folder
app.set('views', __dirname + '/views');

//set our view engine to HTML
app.set('view engine', 'html');

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
