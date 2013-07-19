var mongoose = require('mongoose');
var BodyFat = require('bodyfat').schema();
mongoose.connect('mongodb://localhost/fitness');

var userSchema = mongoose.Schema({
	userName: String,
	gender: { type: String, enum: ['male', 'female'], default: 'male' },
	dateOfBirth: String,
	age: { type: Number, default: 0 },
	height: { type: Number, default: 0 },
	unit: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
	calipers: Boolean,
	bodyFat: [BodyFat]
});