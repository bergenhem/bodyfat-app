window.Record = (function($){
	var _record = {};
	var _recordViewModel = {};

	_recordViewModel = kendo.observable({
		weight: null,
		chest: null,
		abs: null,
		thigh: null,
		calculated: false,
		calculate: function(){
			var dataToPost = {
				date: moment(Date.now()).format('YYYY-MM-DD'),
				gender: settingsViewModel.get('gender'),
				age: settingsViewModel.get('age'),
				unit: settingsViewModel.get('unit'),
				weight: _recordViewModel.get('weight'),
				height: settingsViewModel.get('height'),
				chest: _recordViewModel.get('chest'),
				thigh: _recordViewModel.get('thigh'),
				abs: _recordViewModel.get('abs')
			};
		}
	});

	_record.getRecordViewModel = function() {
		return _recordViewModel;
	}

	return _record;
})(jQuery);