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
						background: '#ebebeb',
						padding: {
							top: 1.5,
							bottom: 1.5,
							left: 4,
							right: 4
						},
						margin: {
							bottom: 0
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
					},
					labels: {
						font: 'bold 12px Arial,Helvetica,sans-serif'
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
					background: '#ebebeb'
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
						visible: true,
						background: '#E0E0E0',
						padding: {
							top: 1.5,
							bottom: 1.5,
							left: 4,
							right: 4
						},
						margin: {
							bottom: 0
						}
					},
					markers: {
						background: 'transparent'
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
					field: 'date',
					majorGridLines: {
						visible: false
					},
					labels: {
						font: 'bold 12px Arial,Helvetica,sans-serif'
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
					background: '#E0E0E0'
				},
				plotArea: {
					background: '#E0E0E0'
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
						visible: true,
						background: '#ebebeb',
						padding: {
							top: 1.5,
							bottom: 1.5,
							left: 4,
							right: 4
						},
						margin: {
							bottom: 0
						}
					},
					markers: {
						background: 'transparent'
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
					field: 'date',
					majorGridLines: {
						visible: false
					},
					labels: {
						font: 'bold 12px Arial,Helvetica,sans-serif'
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
					background: '#ebebeb'
				}
			});
		}
	});

	_dashboardModule.getDashboardViewModel = function() {
		return _dashboardViewModel;
	}

	return _dashboardModule;
})(jQuery);
