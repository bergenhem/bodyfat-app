var sample = [{
	"date": "02242013",
	"gender": "male",
	"age": "24",
	"weight": "75",
	"chest": "15",
	"thigh": "5",
	"ab": "20",
	"bodyFat": null
},
{
	"id": "02252013",
	"gender": "male",
	"age": "24",
	"weight": "75",
	"chest": "15",
	"thigh": "5",
	"ab": "18",
	"bodyFat": null
}];

module.exports = {
	testDB: function() {
		console.log('testDB');
		db.on('error', console.error.bind(console, 'connection error: '));
		db.once('open', function test() {
			console.log("Worked!");
		});
	},
	getSampleData: function() {
  		return sample;
	},
	saveBodyFat: function(bodyFatItem){
		sample.push(bodyFatItem);
	},
	addId: function(bodyFatItem){
		var itemToUpdate = bodyFatItem;
		itemToUpdate.id = convertDateToId(new Date());
		return itemToUpdate;
	},
	updateBodyFatField: function(bodyFatItem) {
		var itemToUpdate = bodyFatItem;
		itemToUpdate.bodyFat = calculateBodyFat(itemToUpdate);
		return itemToUpdate;
	}
}

function convertDateToId (date){
	var dateToReturn;

	var day = date.getDate().toString();
	if(day.length == 1){
		day = "0" + day;
	}

	var month = (date.getMonth() + 1).toString();
	if(month.length == 1){
		month = "0" + month;
	}

	var year = date.getFullYear().toString();

	dateToReturn = day + month + year;

	return dateToReturn;
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