/*!
 * The dispatcher
 * 
 * DEPENDENCIES: ExpressJS, Daemon, Food.js (http://)
 *
 * Author: Joe Reckley (http://joereckley.com)
 * Date: 6-22-2013
 */
 

// Get the process ID
console.log(process.pid);

// Daemonize this app
//require('daemon')();


var	food = require('./food.js'),
	express = require('express'),
	app = express();
	

// Use middleware for getting post data	
app.use(express.bodyParser());


// Serve HTML of homepage
app.use('/', express.static(__dirname + '/public'));


// Insert a meal
app.post('/meal/add/', function(req, res) {
	food.add_meal(req.body, function(response) {
		res.send(response);
	});
});

// Update a meal
app.post('/meal/update/', function(req, res) {
	food.update_meal(req.body, function(response) {
		res.send(response);
	});
});

// Deletes a meal
app.post('/meal/delete/', function(req, res) {
	food.delete_meal(req.body, function(response) {
		res.send(response);
	});
});


// Search USDA database
app.get('/search/:name', function(req, res) {
	food.search_foods(req.params.name, function(data) {
			res.send(data);
	});
});


// Get meals between two dates
app.post('/meals/', function(req, res) {
	food.get_meals(req.body.start_date, req.body.end_date, function(data) {
		res.send(data);
	});
});


// Start the web server
app.listen(3000);
