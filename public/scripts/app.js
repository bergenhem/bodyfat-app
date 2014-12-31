window.FitnessApp = (function($){
	var _window = $(window);
	var _fitnessApp = {};
	var _kendoRouter = {};
	var _fitnessLayout = {};
	var _recordingView = {};
	var _settingsView = {};
	var _loginView = {};
	var _dashView = {};

	//set up our views, layout, and routes
	_fitnessApp.initSPA = function() {

		_fitnessLayout = new kendo.Layout('fitness-layout-template');

		_kendoRouter = new kendo.Router();

		// var	loginViewModel = kendo.observable({
		// 	userName: 'zeL',
		// 	password: 'temp',
		// 	login: function() {
		// 		var tempUser = {
		// 			userName: this.get('userName'),
		// 			password: this.get('password')
		// 		};
		//
		// 		var serializedUser = JSON.stringify(tempUser);
		// 		console.log(serializedUser);
		//
		// 		$.ajax({
		// 			url: '/login',
		// 			type: 'put',
		// 			data: serializedUser,
		// 			contentType: "application/json"
		// 		}).done(function() {
		// 			console.log('Logged in!');
		// 		}).fail(function() {
		// 			console.log('Login failed');
		// 		});
		// 	}
		// });

		_recordingView = new kendo.View('recording-view', {
			model: window.Record.getRecordViewModel(),
			show: function() { window.Record.init(); this.model.updateWeight(); }
		});

		_settingsView = new kendo.View('settings-view', {
			//temporary before RequireJS
			model: window.Settings.getSettingsModel(),
			show: function() { this.model.loadSettings(); }
		});

		_dashView = new kendo.View('dash-view', {
			model: window.Dashboard.getDashboardViewModel(),
			show: function() { this.model.getDashboardData(); }
		});

		// _loginView = new kendo.View('login-view', {
		// 	model: loginViewModel
		// });

		_kendoRouter.route('/', function() {
			_fitnessLayout.showIn('#content', _dashView);
		});

		_kendoRouter.route('/dash', function() {
			_fitnessLayout.showIn('#content', _dashView);
		});

		_kendoRouter.route('/record', function() {
			_fitnessLayout.showIn('#content', _recordingView);
		});

		_kendoRouter.route('/settings', function() {
			_fitnessLayout.showIn('#content', _settingsView);
		});

		// _kendoRouter.route('/login', function() {
		// 	_fitnessLayout.showIn('#content', _loginView);
		// });
	}

	//start our router and render our initial view
	_fitnessApp.startSPA = function() {
		_kendoRouter.start();
		_fitnessLayout.render('#main');
	}

	//start the app
	_fitnessApp.startApp = function () {
		this.initSPA();
		this.startSPA();
	}

	return _fitnessApp;

})(jQuery);
