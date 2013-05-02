window.FitnessApp = (function($){
	var _window = $(window);
	var _fitnessApp = {};

	_fitnessApp.init = function() {

		var caliperWindowView = new kendo.View('caliper-window-view');
		caliperWindowView.render('#content');

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