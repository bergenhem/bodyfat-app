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
		convertWeightToMetric: function(passedWeight) {
			var imperialWeight,
				metricWeight,
				roundedKiloWeight;
				
			imperialWeight = passedWeight;
			metricWeight = imperialWeight * 0.453592;
			roundedKiloWeight = Math.round(metricWeight * 100) / 100;

			return roundedKiloWeight;
		},
		convertHeightToMetric: function(passedHeight) {
			var imperialHeight,
				metricHeight,
				roundedMetricHeight;
		},
		calculate: function(){
			var selectedUnit,
				givenWeight,
				kiloWeight;

			selectedUnit = _settingsViewModel.get('unit');
			givenWeight = _recordViewModel.get('weight');

			if(selectedUnit === 'imperial'){
				kiloWeight = _recordViewModel.convertWeightToMetric(givenWeight);
			}
			else {
				kiloWeight = _recordViewModel.get('weight');
			}

			var dataToPost = {
				date: moment(Date.now()).format('YYYY-MM-DD'),
				gender: _settingsViewModel.get('gender'),
				age: _settingsViewModel.get('age'),
				unit: definedUnit,
				weight: kiloWeight,
				height: _settingsViewModel.get('height'),
				chest: this.get('chest'),
				thigh: this.get('thigh'),
				abs: this.get('abs')
			};

			var serializedDataToPost = JSON.stringify(dataToPost);

			$.ajax({
				url: '/bodyfat',
				type: 'put',
				data: serializedDataToPost,
				contentType: "application/json"
			}).done(function() {
				console.log('done!');
			}).fail(function() {
				console.log('fail');
			});
		}
	});

	_record.getRecordViewModel = function() {
		return _recordViewModel;
	}

	return _record;
})(jQuery);