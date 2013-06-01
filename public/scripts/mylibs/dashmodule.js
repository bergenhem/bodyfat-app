window.Dashboard = (function($){
	var _dashboardModule = {};
	var _dashboardViewModel = {};
	var _dashboardData = {};

	_dashboardModule.init = function() {
		this.getDashboardData();
	}

	_dashboardModule.getDashboardData = function() {
		$.ajax({
			url: '/bodyfat',
			type: 'get',
			contentType: "application/json"
		}).done(_dashboardModule.createObservable)
		.fail(function() {
			console.log('fail');
		});
	}

	_dashboardModule.createObservable = function(data) {
		_dashboardData = data;
		_dashboardViewModel = kendo.observable({
			data: _dashboardData
		});
	}

	_dashboardModule.getDashboardViewModel = function() {
		return _dashboardViewModel;
	}

	return _dashboardModule;
})(jQuery);