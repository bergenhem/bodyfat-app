var mongoose = require('mongoose');
var moment = require('moment');

//define our schema and the defaults
var bodyFatSchema = mongoose.Schema({
	date: { type: String, default: moment(new Date).format('YYYY-MM-DD') },
	weight: { type: Number, default: 0 },
	chest: { type: Number, default: 0 },
	thigh: { type: Number, default: 0 },
	abs: { type: Number, default: 0 },
	bmi: { type: Number, default: 0 },
	bodyFatPercentage: { type: Number, default: 0 },
	bodyFat: { type: Number, default: 0},
	leanBodyMass: { type: Number, default: 0 },
	ffmi: { type: Number, default: 0 }
});


//hide _id and __v when using toObject
bodyFatSchema.options.toObject = { transform: function(doc, ret, options) {
	delete ret._id;
	delete ret.__v;
}};

//hide _id and __v when using toJSON/JSON.stringify()
bodyFatSchema.options.toJSON = { transform: function(doc, ret, options) {
	delete ret._id;
	delete ret.__v;
}};

//calculate BMI (Body Mass Index)
bodyFatSchema.methods.calcBMI = function (passedHeight) {
	var calculatedBmi 	= 0,
		heightCm 		= passedHeight,
		weightKg		= this.weight;
	
	//convert height to meters
	heightCm = heightCm / 100;
	calculatedBmi = weightKg / (heightCm * heightCm);

	this.bmi = Math.round(calculatedBmi * 100) / 100;

	/*
	* Below 18.5 = Underweight
	* 18.5 - 24.9 = Normal
	* 25 - 29.9 = Overweight
	* 30 and above = obese
	*/
};


//Calculation formula found at: http://jumk.de/bmi/body-fat-rate.php
//Also known as the Jackson/Pollock 3-point formula
bodyFatSchema.methods.calcBFValues = function(passedAge, passedGender) {
	var age 	= passedAge,
		gender	= passedGender,
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

//calculate total fat weight
bodyFatSchema.methods.calcFat = function () {
	var fatKg 			= 0,
		bodyFatPercent 	= this.bodyFatPercentage,
		weightKg		= this.weight;

	fatKg = weightKg * (bodyFatPercent / 100);

	this.bodyFat = Math.round(fatKg * 100) / 100;
};

//calculate lean muscle weight
bodyFatSchema.methods.calcLeanMuscle = function () {
	var muscleKg 	= 0,
		fatKg 		= this.bodyFat,
		weightKg 	= this.weight;

	muscleKg = weightKg - fatKg;

	this.leanBodyMass = Math.round(muscleKg * 100) / 100;
};

//Calculation algorithm found at: http://www.ncbi.nlm.nih.gov/pubmed/7496846?dopt=Abstract
//Calculates FFMI (Fat Free Mass Index)
bodyFatSchema.methods.calcFFMI = function (passedHeight) {
	var ffmi 		= 0,
		bodyMass 	= this.leanBodyMass,
		heightCm 	= passedHeight;

	//convert this to full meters
	heightCm = heightCm / 100;

	ffmi = (bodyMass / (heightCm * heightCm)) + (6.1 * (1.8 - heightCm));
	this.ffmi = Math.round(ffmi * 100) / 100;

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

//initialize all of the calculations
bodyFatSchema.methods.initCalculations = function(passedHeight, passedGender, passedAge) {

	console.log('Init: \n' + passedHeight + ', ' + passedGender + ', ' + passedAge);

	this.calcBMI(passedHeight);
	this.calcBFValues(passedAge, passedGender);
	this.calcFat();
	this.calcLeanMuscle();
	this.calcFFMI(passedHeight);
}	

module.exports = mongoose.model('BodyFat', bodyFatSchema, 'bodyfat');