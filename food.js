/*!
 * A NodeJS module for interacting with a MongoDB version of the USDA nutritional database.
 * Also has support for creating and retrieving meals (a collection of foods with an amount and other info)
 * A MondgoDB export of this database can be found here:
 * Credit to Ashley Williams for the initial JSON version of this database (http://ashleyw.co.uk/project/food-nutrient-database).
 *
 * DEPENDENCIES: MongoDB native driver for NodeJS (https://github.com/mongodb/node-mongodb-native)
 *
 * Author: Joe Reckley (http://joereckley.com)
 * Date: 6-22-2013
 */



var mongo = require('mongodb'),
	BSON = mongo.BSONPure,
	_und = require('underscore'), 
	db = 'mongodb://localhost:27017/food_db', // Local database configuration
	food_coll = 'food'; // Mongo collection name
	meal_coll = 'meals';



/*!
 * Search the database
 * @param {String} search term
 * @param {Function} callback
 * @return {String} json response
 */	
exports.search_foods = function(term, callback) {

	// Connect to database 
	mongo.connect(db, function(err, db) {
		if(err) {return console.log('Error: ' + err);} 
		
		// Set collection 
		var collection = db.collection(food_coll);
		
		// Build search expression 
		var parts = term.split(' ');
		var expression = '^('+parts[0]+')';
		for(var i = 1; i < parts.length; i++){
			expression += '(?=.*\\b' + parts[i]+')';
		}
		expression += '.*';
		
		// Query database 
		collection.find({'description': {$regex : expression, $options: 'i'}}).toArray(function(err, items) {
			if(err) {return console.log('Error: ' + err);}
			
			// Build response
			var response = {};
			response.term = term;
			response.data = items;
			
			// Respond and close db connection
			callback(response);
			db.close();
		});
		
	});
};



/*!
 * Get food by name
 * @param {String} food name
 * @param {Function} callback
 * 
 */
exports.get_food = function (name, callback) {

	// Connect to database 
	mongo.connect(db, function(err, db) {
		if(err) {return console.log('Error: ' + err);} 
		
		// Set collection 
		var collection = db.collection(food_coll);
		
		// Query database 
		collection.find({'name': name}).toArray(function(err, items) {
			if(err) {return console.log('Error: ' + err);}
			
			// Build response
			var response = {};
			response.name = name;
			response.data = items;
			
			// Respond and close db connection
			callback(response);
			db.close();
		});
		
	});

};



/*!
 * Add meal 
 * @param {Object} meal object
 * @param {Function} callback
 * 
 */
exports.add_meal = function(meal, callback) {

	// Convert date 
	meal.date = new Date(meal.date);
	
	// Build meal object
	var meal_object = {
		date: meal.date,
		type: meal.type,
		food: []
	}
	
	// Build food objects and add to meal
	for(var i = 0; i < meal.food.length; i++) {
		var food = {
			name: meal.food[i],
			amount: meal.amount[i],
			unit: meal.unit[i]
		}
		meal_object.food.push(food);
	}
	
	// Connect to database 
	mongo.connect(db, function(err, db) {
		if(err) {return console.log('Error: ' + err);} 
		
		// Set collection 
		var collection = db.collection(meal_coll);
		
		//Insert into database 
		collection.insert(meal_object, function(err, records) {
			callback(records);
			db.close();
		});
	});
};




/*!
 * Delete meal 
 * @param {Int} meal ID
 * @param {Function} callback
 * 
 */
exports.delete_meal = function(data, callback) {
	
	// Connect to database 
	mongo.connect(db, function(err, db) {
		if(err) {return console.log('Error: ' + err);} 
		
		// Set collection 
		var collection = db.collection(meal_coll);
		
		var objid = new BSON.ObjectID(data.id);
						
		//Insert into database 
		collection.findAndModify({'_id': objid},[], {remove:true}, function(err, message) {
			if(err) {return console.log('Error: ' + err);}
			console.log(message);
			callback(message);
			db.close();
		});
	});
};



/*!
 * Get meals between two dates
 * @param {String} beginning date string (ie 01/01/2013)
 * @param {String} ending date string
 * @param {Function} callback
 * 
 */ 
exports.get_meals = function(begin, end, callback) {
	
	// Connect to database 
	mongo.connect(db, function(err, db) {
		if(err) {return console.log('Error: ' + err);} 
		
		// Set collection 
		var collection = db.collection(meal_coll);

		// Convert date string to object
		var b_date  = new Date(begin);
		var e_date = new Date(end);
		
		// Define query based on whether we are searching for one date or between dates
		var query = {};
		if(b_date.toDateString() == e_date.toDateString()) {
			query = {date: b_date};	
		} else {
			query = {date: {$gte: b_date, $lt: e_date}}	
		}
			
		// Query database 
		collection.find(query).toArray(function(err, items) {
			if(err) {return console.log('Error: ' + err);}
			
			// Get list of foods in meal and convert date
			var food_list = [];
			for( var i = 0; i < items.length; i++) {
				for(var u = 0; u < items[i].food.length; u++) {
					food_list.push(	 items[i].food[u].name );
				}
				var d = new Date(items[i].date);
				var year = d.getFullYear();
     			var month = ("0" + (d.getMonth() + 1)).slice(-2);
     			var date = ("0" + d.getDate()).slice(-2);
     			items[i].date = month + '/' + date + '/' + year;
			}
			
			// Get nutrional data for foods in meal
			get_food_data(food_list, function(f_data) {
				
				// Calculate nutrition for meals
				calculate_nutrition(items, f_data, function(response) {
					
					// Respond with meals complete with nutritional data
					callback(response);
				});
			});
			
		});
		
	});
};


/*!
 * Calculate nutrition data for meals
 * @param {Array} Array of meal objects
 * @param {Array} Array food objects
 * @param {Function} callback
 * 
 */ 
var calculate_nutrition = function(meals, f_data, callback) {
	
	var total_cal = 0;
	for(var e = 0; e < meals.length; e++) {
		for(var w = 0; w < meals[e].food.length; w++) {
			var f_facts = _und.findWhere(f_data, {description: meals[e].food[w].name});
			var calories = _und.findWhere(f_facts.nutrients, {description: 'Energy'});
			
			// Get the weight of the portion - default is 100g
			var grams = 100;
			if(meals[e].food[w].unit){
				var parts = meals[e].food[w].unit.split('(');
				if(parts.length > 1) {
					grams = parts[1].split('g');
					grams = parseInt(grams[0]);
				}
			}
			
			// Get the calories for each amount of food and add to total calories for meal
			calories = Math.ceil(((grams/100) * calories.value) * meals[e].food[w].amount); 
			total_cal += calories;
			
			// Add to food object
			meals[e].food[w].group = f_facts.group;
			meals[e].food[w].portions = f_facts.portions;
			meals[e].food[w].nutrients =  f_facts.nutrients;
			meals[e].food[w].calories =  calories;
			meals[e].food[w].grams =  grams;
			meals[e].food[w].id = f_facts.id;
		}
	}
	
	var response = {
		meals: meals,
		calories: total_cal
	}
	
	// Respond with complete meal and food objects
	callback(response);
}



/*!
 * Get nutrition data for a list of food names
 * @param {Array} List of food names
 * @param {Function} callback
 * 
 */ 
var get_food_data = function(foods, callback) {
	
	mongo.connect(db, function(err, db) {
		if(err) {return console.log('Error: ' + err);}
	
		// Set db collection
		collection = db.collection(food_coll);
		
		collection.find({description: { $in : foods	}}).toArray(function(err, items) {
			callback(items);
			db.close();
		});
		
		
	});
}





