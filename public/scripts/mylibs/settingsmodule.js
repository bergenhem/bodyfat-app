window.Settings = (function($){
	var _settingsModule = {};
	var _settingsWindowModel = {};

	//temporary before RequireJS
	_settingsModule.init = function() {
		_settingsWindowModel = kendo.observable({
			unit: 'metric',
			age: 0,
			height: 0,
			gender: 'male',
			calipers: true
		});
	}

	_settingsModule.getSettingsModel = function() {
		return _settingsWindowModel;
	}

	return _settingsModule;

})(jQuery);