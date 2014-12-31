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
		createCharts: function(data) {
			$('#weightChart').kendoChart({
				theme: 'flat',
				dataSource: {
					data: data
				},
				seriesDefaults: {
					type: 'line',
					labels: {
						visible: true,
						margin: {
							bottom: -3
						}
					},
					markers: {
						background: 'transparent'
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
					field: 'date',
					majorGridLines: {
						visible: false
					}
				},
				valueAxis: {
					line: {
						visible: false
					}
				},
				legend: {
					margin: {
						top: 20
					},
					position: 'bottom'
				},
				chartArea: {
					background: '#ebebeb'
				},
			  plotArea: {
					background: '#ebebeb',
					border: {
						width: 0,
						color: 'red'
					}
				}
			});

			$('#caliperChart').kendoChart({
				theme: 'flat',
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
				theme: 'flat',
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
