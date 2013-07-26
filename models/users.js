var mongoose = require('mongoose');
var BodyFat = mongoose.model('BodyFat').Schema;
var moment = require('moment');
mongoose.connect('mongodb://localhost/testfitness');

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

//hide _id and __v when using toObject
userSchema.options.toObject = { transform: function(doc, ret, options) {
	delete ret._id;
	delete ret.__v;
}};

//hide _id and __v when using toJSON/JSON.stringify()
userSchema.options.toJSON = { transform: function(doc, ret, options) {
	delete ret._id;
	delete ret.__v;
}};

module.exports = mongoose.model('UserModel', userSchema, 'UserList');