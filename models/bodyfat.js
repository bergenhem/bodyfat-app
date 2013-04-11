var mongoose = require('mongoose');
var moment = require('moment');
mongoose.connect('mongodb://localhost/fitness');

var bodyFatSchema = mongoose.Schema({
	date: { type: String, default: moment(new Date).format('YYYY-MM-DD') },
	gender: { type: String, enum: ['male', 'female'], default: 'male' },
	age: { type: Number, default: 0 },
	unit: { type: String, enum: ['metric', 'imperial'], default: 'imperial'},
	weight: { type: Number, default: 0 },
	height: { type: Number, default: 0},
	chest: { type: Number, default: 0 },
	thigh: { type: Number, default: 0 },
	abs: { type: Number, default: 0 },
	bmi: { type: Number, default: 0 },
	bodyFatPercentage: { type: Number, default: 0 },
	bodyFat: { type: Number, default: 0},
	leanBodyMass: { type: Number, default: 0 },
	ffmi: { type: Number, default: 0 }
});


//Hide _id and __v when using toObject
bodyFatSchema.options.toObject = { transform: function(doc, ret, options) {
	delete ret._id;
	delete ret.__v;
}};

//Hide _id and __v when using toJSON/JSON.stringify()
bodyFatSchema.options.toJSON = { transform: function(doc, ret, options) {
	delete ret._id;
	delete ret.__v;
}};

bodyFatSchema.methods.calcBMI = function () {
	var calculatedBmi 	= 0,
		unitType 		= this.unit,
		height 			= this.height,
		weight			= this.weight;

		if(unitType === "imperial") {
			calculatedBmi = (weight * 703) / (height * height);
		}
		else if(unitType === "metric") {
			calculatedBmi = weight / (height * height);
		}

	this.bmi = calculatedBmi;

	/*
	* Below 18.5 = Underweight
	* 18.5 - 24.9 = Normal
	* 25 - 29.9 = Overweight
	* 30 and above = obese
	*/
};

bodyFatSchema.methods.calcBFValues = function() {
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

	this.bodyFatPercentage = roundedBodyFatPercentage;
};

bodyFatSchema.methods.calcFat = function () {
	var fat 	= 0,
		bf 		= this.bodyFatPercentage,
		weight 	= this.weight;

	fat = weight * (bf / 100);

	this.bodyFat = fat;
};

bodyFatSchema.methods.calcLeanMuscle = function () {
	var muscle 	= 0,
		fat 	= this.bodyFat,
		weight 	= this.weight;

	muscle = weight - fat;

	this.leanBodyMass = muscle;
};

//calc found at: http://scoobysworkshop.com/body-fat-calculator/
bodyFatSchema.methods.calcFFMI = function () {
	var ffmi 		= 0,
		unitType 	= this.unit,
		bodyMass 	= this.leanBodyMass,
		height 		= this.height;

	if(unitType === "imperial") {
		height = height * 0.254;
		bodyMass = bodyMass * 0.454;
	}

	ffmi = (bodyMass / (height * height)) + (6.1 * (1.8 - height));
	this.ffmi = ffmi;

	/*
	* 19-20: average FFMI for college students
	* 20-23: noticeably muscular
	* 26: steroid user
	* Note: FFMI measures fat free mass. At what level fat free mass someone
	* will look muscular depends on their frame size. Someone with narrow hips,
	* small wrists, and small knees can look very muscular at a FFMI of 20.
	* The inverse is true also. Someone with a FFMI of 23 might not look
	* muscular at all if they have really wide hips, big wrists, and big knees
	*/
}	

module.exports = mongoose.model('BodyFat', bodyFatSchema, 'bodyfat');