var sample = [{
	"id": "1",
	"date": "today",
	"gender": "male",
	"age": "24",
	"weight": "75",
	"chest": "15",
	"thigh": "5",
	"ab": "20",
	"bodyFat": null
},
{
	"id": "2",
	"date": "tomorrow",
	"gender": "male",
	"age": "24",
	"weight": "75",
	"chest": "15",
	"thigh": "5",
	"ab": "18",
	"bodyFat": null
}];

module.exports = {
	getSampleData: function() {
  		return sample;
	},
	saveBodyFat: function(bodyFatItem){
		sample.push(bodyFatItem);
	},
	updateBodyFatField: function(bodyFatItem) {
		var itemToUpdate = bodyFatItem;
		itemToUpdate.bodyFat = calculateBodyFat(itemToUpdate);
		return itemToUpdate;
	}
}
/* formulas taken from Live Strong article:
* http://www.livestrong.com/article/378022-how-to-calculate-body-fat-from-caliper-measurements/
* This is the Jackson-Pollock formula
*
* Men:
* body density = 1.10938 - (0.0008267 * Sum(Chest, Abdomen, Thigh [in mm])) + (0.0000016 * Sum(Chest, Abdomen, Tigh [in mm])^2) - (0.0002574 * age)
* 
* Women:(
* body density = 1.0994921 - (0.0009929 * Sum(Triceps, Waist, Thigh [in mm])) + (0.0000023 * Sum(Triceps, Waist, Thigh [in mm])^2) - (0.0001392 * age)
*
* BF % using the Siri equation
*
* Men & Women :
* BF% =  ((4.95/bone density) - 4.5) * 100
*/
function calculateBodyFat (bodyFatItem){
	var age 	= parseInt(bodyFatItem.age),
		gender	= bodyFatItem.gender,
		chest 	= parseInt(bodyFatItem.chest),
		thigh 	= parseInt(bodyFatItem.thigh),
		ab 		= parseInt(bodyFatItem.ab),
		totalMM, boneDensity;

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

	return roundedBodyFatPercentage;
}