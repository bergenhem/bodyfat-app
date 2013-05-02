window.FitnessApp = (function($){
	var _window = $(window);
	var _fitnessApp = {};

	_fitnessApp.init = function() {
		var modalWindow = $('#caliperWindow');
		modalWindow.kendoWindow({
			title: "Before We Begin",
			modal: true,
			draggable: false,
			resizable: false,
			width: 400,
			height: 250
		}).data('kendoWindow').center();;
	}

	return _fitnessApp;

})(jQuery);