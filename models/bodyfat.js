var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/fitness');

var bodyFatSchema = mongoose.Schema({
	date: { type: Date, default: (Date.now).format('dd/mm/yyyy') },
	gender: { type: String, enum: ['male', 'female'], default: 'male' },
	age: { type: Number, default: 0 },
	unit: { type: String, enum: ['metric', 'imperial'], default: 'imperial'},
	weight: { type: Number, default: 0 },
	chest: { type: Number, default: 0 },
	thigh: { type: Number, default: 0 },
	abs: { type: Number, default: 0 },
	bodyFat: { type: Number, default: 0 }
});

bodyFatSchema.methods.calcBodyFat = function() {
	var age 	= this.age,
		gender	= this.gender,
		chest 	= this.chest,
		thigh 	= this.thigh,
		ab 		= this.abs,
		totalMM,
		boneDensity;

	//add all measurements together
	var totalMM = chest + thigh + ab;

	//calculate bone density
	if(gender === "male"){
	    boneDensity = 1.10938 - (0.0008267 * totalMM) + (0.0000016 * totalMM * totalMM) - (0.0002574 * age);
	}
	else if(gender === "female"){
	    boneDensity = 1.0994921 - (0.0009929 * totalMM) + (0.0000023 * totalMM * totalMM) - (0.0001392 * age)
	}

	//calculate BF%
	var bodyFatPercentage = ((4.95 / boneDensity) - 4.5) * 100;

	//round the BF%
	var roundedBodyFatPercentage = Math.round(bodyFatPercentage * 100) / 100;

	this.bodyFat = roundedBodyFatPercentage;
};

module.exports = mongoose.model('BodyFat', bodyFatSchema, 'bodyfat');