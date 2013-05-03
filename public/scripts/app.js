window.FitnessApp = (function($){
	var _window = $(window);
	var _fitnessApp = {};
	var _kendoRouter = {};
	var _fitnessLayout = {};
	var _caliperWindowView = {};

	//set up our views, layout, and routes
	_fitnessApp.initSPA = function() {

		var caliperWindowModel = kendo.observable({
		});
		
		_caliperWindowView = new kendo.View('caliper-window-view', {
			model: caliperWindowModel,
			show: function() {
				$('#caliperWindow').data('kendoWindow').center();
			}
		});
		
		_fitnessLayout = new kendo.Layout('fitness-layout-template');

		_kendoRouter = new kendo.Router();

		_kendoRouter.route('/', function() {
			_fitnessLayout.showIn('#content', _caliperWindowView);
		});
	}

	//start our router and render our initial view
	_fitnessApp.startSPA = function() {
		_kendoRouter.start();
		_fitnessLayout.render('#main');
		_fitnessLayout.showIn('#content', _caliperWindowView);
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
		//this.initKendo();
	}

	return _fitnessApp;

})(jQuery);