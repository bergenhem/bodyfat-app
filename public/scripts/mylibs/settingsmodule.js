window.Settings = (function($){
	var _settingsModule = {};
	var _settingsWindowModel = {};

	//temporary before RequireJS
	_settingsModule.init = function() {
		_settingsWindowModel = kendo.observable({
			unit: '',
			age: 0,
			height: 0,
			gender: '',
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
					url: '/settings',
					type: 'put',
					data: serializedDataToPost,
					contentType: "application/json"
				}).done(function() {
					console.log('Settings saved!');
				}).fail(function() {
					console.log('Settings failed to save.');
				});
			},
			loadSettings: function() {
				$.ajax({
					url: '/settings',
					type: 'get',
					contentType: 'application/json'
				}).done(function(userData) {
					this.set('unit', userData.unit);
					this.set('age', userData.age);
					this.set('height', userData.height);
					this.set('gender', userData.gender);
					this.set('calipers', userData.calipers);
				});
			}
		});
	}

	_settingsModule.getSettingsModel = function() {
		return _settingsWindowModel;
	}

	return _settingsModule;

})(jQuery);