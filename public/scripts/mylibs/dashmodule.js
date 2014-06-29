window.Dashboard = (function($){
	var _dashboardModule = {};
	var _dashboardViewModel = {};
	var _dashboardData = {};

	_dashboardViewModel = kendo.observable({
		getDashboardData: function() {
			$.ajax({
				url: '/bodyfat',
				type: 'get',
				contentType: "application/json"
			}).done(function(data) {
				_dashboardViewModel.createCharts(data.bodyFat);
			})
			.fail(function() {
				console.log('fail');
			});
		},
		createCharts = function(data) {
			$('#weightChart').kendoChart({
				dataSource: {
					data: data
				},
				seriesDefaults: {
					type: 'line',
					labels: {
						visible: true
					}
				},
				series: [{
					field: 'weight',
					name: 'Weight'
				},
				{
					field: 'bodyFat',
					name: 'Body Fat'
				},
				{
					field: 'leanBodyMass',
					name: 'Lean Mass'
				}],
				categoryAxis: {
					field: 'date'
				}
			});

			$('#caliperChart').kendoChart({
				dataSource: {
					data: data
				},
				seriesDefaults: {
					type: 'line',
					labels: {
						visible: true
					}
				},
				series: [{
					field: 'chest',
					name: 'Weight'
				},
				{
					field: 'abs',
					name: 'Abs'
				},
				{
					field: 'thigh',
					name: 'Thigh'
				}],
				categoryAxis: {
					field: 'date'
				}
			});

			$('#indexChart').kendoChart({
				dataSource: {
					data: data
				},
				seriesDefaults: {
					type: 'line',
					labels: {
						visible: true
					}
				},
				series: [{
					field: 'bmi',
					name: 'BMI'
				},
				{
					field: 'ffmi',
					name: 'FFMI'
				}],
				categoryAxis: {
					field: 'date'
				}
			});
		}
	});

	_dashboardModule.getDashboardViewModel = function() {
		return _dashboardViewModel;
	}

	return _dashboardModule;
})(jQuery);
