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
			calipers: true,
			heightDisplay: '(cm)',
			unitSelect: function() {
				if(this.get('unit') === 'metric') {
					this.set('heightDisplay', '(cm)');
				}
				else if(this.get('unit') === 'imperial') {
					this.set('heightDisplay', '(in)');
				}
			}
		});
	}

	_settingsModule.getSettingsModel = function() {
		return _settingsWindowModel;
	}

	return _settingsModule;

})(jQuery);