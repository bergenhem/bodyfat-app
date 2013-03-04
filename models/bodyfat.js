var mongoose = require('mongoose');

var bodyFatSchema = mongoose.Schema({
	date: String,
	gender: String,
	age: Number,
	unit: { type: String, enum: ['metric', 'imperial']},
	weight: Number,
	chest: Number,
	thigh: Number,
	abs: Number,
	bodyFat: Number
});

bodyFatSchema.methods.calcBodyFat = function() {
	var age 	= this.age,
		gender	= this.gender,
		chest 	= this.chest,
		thigh 	= this.thigh,
		ab 		= this.ab,
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

	console.log("BF : " + roundedBodyFatPercentage);
};

bodyFatSchema.methods.test = function(){
	console.log("Test: " + this.gender);
}

var BodyFat = mongoose.model('BodyFatItem', bodyFatSchema);