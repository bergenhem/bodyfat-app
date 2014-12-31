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
		_kendoRouter.bind('change', function(e) {
			_fitnessApp.selectMenuItem();
		});

		_recordingView = new kendo.View('recording-view', {
			model: window.Record.getRecordViewModel(),
			show: function() {
				this.model.viewInit();
				this.model.updateWeight();
				}
		});

		_settingsView = new kendo.View('settings-view', {
			//temporary before RequireJS
			model: window.Settings.getSettingsModel(),
			show: function() {
				this.model.loadSettings();
			}
		});

		_dashView = new kendo.View('dash-view', {
			model: window.Dashboard.getDashboardViewModel(),
			show: function() {
				this.model.getDashboardData();
			}
		});

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
	}

	//start our router and render our initial view
	_fitnessApp.startSPA = function() {
		_kendoRouter.start();
		_fitnessLayout.render('#main');
	}

  //really just used for the main menu
	_fitnessApp.wireEvents = function() {

		//highlight what view we are currently on
		$('#navigation li').on('click', function(e) {
			$('#navigation li a.menu-selected').removeClass('menu-selected')
			$(e.target).addClass('menu-selected');
		});
	}

	_fitnessApp.selectMenuItem = function() {
		//this can vary depending on where a user enters the application
		var currentView = document.URL.split('#/')[1];

		$('#navigation li a.menu-selected').removeClass('menu-selected')

		if(currentView === undefined || currentView === '') {
			$('#navigation li a[href="/#/dash"]').addClass('menu-selected');
		}
		else {
			$('#navigation li a[href="/#/' + currentView + '"]').addClass('menu-selected');
		}
	}

	//start the app
	_fitnessApp.startApp = function () {
		this.initSPA();
		this.startSPA();
		this.selectMenuItem();
	}

	return _fitnessApp;

})(jQuery);
