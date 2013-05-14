window.FitnessApp = (function($){
	var _window = $(window);
	var _fitnessApp = {};
	var _kendoRouter = {};
	var _fitnessLayout = {};
	var _caliperWindowView = {};
	var _recordingView = {};
	var _settingsView = {};
	var _introView = {};

	//set up our views, layout, and routes
	_fitnessApp.initSPA = function() {

		_fitnessLayout = new kendo.Layout('fitness-layout-template');

		_kendoRouter = new kendo.Router();

		var caliperWindowModel = kendo.observable({
			bmiClick: function(e){
				e.preventDefault();
				$('#caliperWindow').data('kendoWindow').close();
				_kendoRouter.navigate('/bmi');
			},
			bfClick: function(e){
				e.preventDefault();
				$('#caliperWindow').data('kendoWindow').close();
				_kendoRouter.navigate('/bodyfat');
			},
			explanationClick: function(e){
				e.preventDefault();
			}
		});
		
		_caliperWindowView = new kendo.View('caliper-window-view', {
			model: caliperWindowModel,
			show: function() {
				//center window and hide close button
				$('#caliperWindow').data('kendoWindow').center().element.parent().find(".k-window-action").css("visibility", "hidden");;
				$('#caliperExplanation').kendoTooltip({
					content: kendo.template($('#tooltipTemplate').html()),
					position: "right",
					width: 300
				});
			}
		});

		window.Settings.init();

		_recordingView = new kendo.View('recording-view', {
			model: window.Record.getRecordViewModel()
		});

		_settingsView = new kendo.View('settings-view', {
			//temporary before RequireJS
			model: window.Settings.getSettingsModel()
		});

		_introView = new kendo.View('intro-view', {
		});

		_kendoRouter.route('/', function() {
			_fitnessLayout.showIn('#content', _introView);
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

	//placeholder function to set up Kendo UI Widgets
	_fitnessApp.initKendo = function() {
		var modalWindow = $('#caliperWindow');
		modalWindow.kendoWindow({
			title: "Before We Begin",
			modal: true,
			draggable: false,
			resizable: false,
			width: 400,
			height: 250
		}).data('kendoWindow').center();

		$('#caliperExplanation').kendoTooltip({
			content: kendo.template($('#tooltipTemplate').html()),
			position: "right",
			width: 300
		});
	}

	//start the app
	_fitnessApp.startApp = function () {
		this.initSPA();
		this.startSPA();
	}

	return _fitnessApp;

})(jQuery);