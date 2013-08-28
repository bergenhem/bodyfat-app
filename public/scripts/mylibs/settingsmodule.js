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
			},
			saveSettings: function() {
				var dataToPost = {
					unit: _settingsViewModel.get('unit'),
					age: _settingsViewModel.get('age'),
					height: _settingsViewModel.get('height'),
					gender: _settingsViewModel.get('gender'),
					calipers: _settingsViewModel.get('calipers')
				};

				var serializedDataToPost = JSON.stringify(dataToPost);

				console.log(serializedDataToPost);

				$.ajax({
					url: '/saveSettings',
					type: 'put',
					data: serializedDataToPost,
					contentType: "application/json"
				}).done(function() {
					console.log('Settings saved!');
				}).fail(function() {
					console.log('Settings failed to save.');
				});
			}
		});
	}

	_settingsModule.getSettingsModel = function() {
		return _settingsWindowModel;
	}

	return _settingsModule;

})(jQuery);