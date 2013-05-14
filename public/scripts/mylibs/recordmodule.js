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
			console.log('calc');
			console.log(this.weight);
		}
	});

	_record.getRecordViewModel = function() {
		return _recordViewModel;
	}

	return _record;
})(jQuery);