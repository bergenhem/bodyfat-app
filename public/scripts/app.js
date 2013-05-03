window.FitnessApp = (function($){
	var _window = $(window);
	var _fitnessApp = {};
	var _kendoRouter = {};
	var _fitnessLayout = {};
	var _caliperWindowView = {};

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
			}
		});
		
		_caliperWindowView = new kendo.View('caliper-window-view', {
			model: caliperWindowModel,
			show: function() {
				//center window and hide close button
				$('#caliperWindow').data('kendoWindow').center().element.parent().find(".k-window-action").css("visibility", "hidden");;
			}
		});

		var bmiView = new kendo.View('bmi-view', {
		});

		var bfView = new kendo.View('body-fat-view', {
		});

		_kendoRouter.route('/', function() {
			_fitnessLayout.showIn('#content', _caliperWindowView);
		});

		_kendoRouter.route('/bmi', function() {
			_fitnessLayout.showIn('#content', bmiView);
		});

		_kendoRouter.route('/bodyfat', function() {
			_fitnessLayout.showIn('#content', bfView);
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