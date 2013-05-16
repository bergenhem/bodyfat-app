window.Record = (function($){
	var _record = {};
	var _recordViewModel = {};
	var _settingsViewModel = {};

	_record.init = function(){
		_settingsViewModel = window.Settings.getSettingsModel();
	}

	_recordViewModel = kendo.observable({
		weight: null,
		chest: null,
		abs: null,
		thigh: null,
		calculated: false,
		weightDisplay: '(kg)',
		updateWeight: function() {
			var unitSetting = _settingsViewModel.get('unit');

			if(unitSetting === 'metric') {
				this.set('weightDisplay', '(kg)');
			}
			else if(unitSetting === 'imperial') {
				this.set('weightDisplay', '(lbs)');
			}
		},
		calculate: function(){
			var dataToPost = {
				date: moment(Date.now()).format('YYYY-MM-DD'),
				gender: _settingsViewModel.get('gender'),
				age: _settingsViewModel.get('age'),
				unit: _settingsViewModel.get('unit'),
				weight: this.get('weight'),
				height: _settingsViewModel.get('height'),
				chest: this.get('chest'),
				thigh: this.get('thigh'),
				abs: this.get('abs')
			};
		}
	});

	_record.getRecordViewModel = function() {
		return _recordViewModel;
	}

	return _record;
})(jQuery);