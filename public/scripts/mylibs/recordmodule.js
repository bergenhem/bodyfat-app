window.Record = (function($){
	var _record = {};
	var _recordViewModel = {};
	var _settingsViewModel = {};

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
			var imperialWeightIn,
				metricWeightCm,
				roundedMetricWeightKg;

			imperialWeightIn = passedWeight;
			metricWeightCm = imperialWeightIn * 0.453592;
			roundedMetricWeightKg = Math.round(metricWeightCm * 100) / 100;

			return roundedMetricWeightKg;
		},
		convertHeightToMetric: function(passedHeight) {
			var imperialHeightIn,
				metricHeightCm,
				roundedMetricHeightCm;

			imperialHeightIn = passedHeight;
			metricHeightCm = imperialHeightIn * 2.54;
			roundedMetricHeightCm = Math.round(metricHeightCm * 100) / 100;

			return roundedMetricHeight;
		},
		calculate: function(){
			var selectedUnit,
				givenWeight,
				givenHeight,
				metricWeightKg,
				metricHeightCm;

			selectedUnit = _settingsViewModel.get('unit');
			givenWeight = _recordViewModel.get('weight');
			givenHeight = _settingsViewModel.get('height');

			if(selectedUnit === 'imperial'){
				metricWeightKg = _recordViewModel.convertWeightToMetric(givenWeight);
				metricHeightCm = _recordViewModel.convertHeightToMetric(givenHeight);
			}
			else {
				metricWeightKg = givenWeight;
				metricHeightCm = givenHeight;
			}

			var dataToPost = {
				date: moment(Date.now()).format('YYYY-MM-DD'),
				gender: _settingsViewModel.get('gender'),
				age: _settingsViewModel.get('age'),
				unit: selectedUnit,
				weight: metricWeightKg,
				height: metricHeightCm,
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
		},
		viewInit: function() {
			_settingsViewModel = window.Settings.getSettingsModel();
		}
	});

	_record.getRecordViewModel = function() {
		return _recordViewModel;
	}

	return _record;
})(jQuery);
