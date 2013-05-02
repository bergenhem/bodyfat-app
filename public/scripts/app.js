window.FitnessApp = (function($){
	var _window = $(window);
	var _fitnessApp = {};

	_fitnessApp.init = function() {
		$('#caliperWindow').kendoWindow();
	}

	return _fitnessApp;

})(jQuery);