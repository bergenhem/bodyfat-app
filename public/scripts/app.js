window.FitnessApp = (function($){
	var _window = $(window);
	var _fitnessApp = {};
	var _kendoRouter = {};

	_fitnessApp.initSPA = function() {

		var caliperWindowView = new kendo.View('caliper-window-view');
		
		_kendoRouter = new kendo.Router();

		_kendoRouter.route("/", function() {
			caliperWindowView.render('#content');
		});

		_kendoRouter.start();
	}

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

	return _fitnessApp;

})(jQuery);