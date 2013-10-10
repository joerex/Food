/*!
 * A front-end interface for tracking meals and reviewing diet choices.
 *
 * Author: Joe Reckley (http://joereckley.com)
 * Date: 6-22-2013
 */


(function() {

var endpoints = {

	search: 'http://joereckley.com:3000/search/',
	create: 'http://joereckley.com:3000/create/',
	add_meal: 'http://joereckley.com:3000/meal/add/',
	get_meals: 'http://joereckley.com:3000/meals/',
	delete_meal: 'http://joereckley.com:3000/meal/delete/',
	get_food: 'http://joereckley.com:3000/food/'
};

var food = {

	search_interval: null, 
	
	last_query: null, // Used to get more details about food without re-querying the database
	
	search_queue: [], // Search queue makes sure nothing but the most recent search is shown
	
	// This function is called at intervals if data is being typed into input.food 
	search_foods: function() {
			// Get input value
			var term = $('.active input.food').val().trim();
			// Set hint
			$('.active input.food').addClass('searching');
			// Update search queue
			this.search_queue.push(term);
			var context = this;
			$.ajax({
				type: 'GET',
				url: endpoints.search + term,
				success: function(response) {
						console.log('Search has response');
						/* Make sure this is the latest search */
						if(_.indexOf(context.search_queue, response.term) == (context.search_queue.length-1)) {
							console.log('Search is latest');
							// Update last_query
							context.last_query = {foods: response.data};
							// Since this is the last query we can clear the stack
							context.search_queue = [];
							// If results were found render with the template
							if(response.data.length > 0) {
								console.log(response.data);
								var template = _.template( $( "#search-template" ).html() );
								$('.active .search-results').html(template({foods: response.data})).show();
							} else {
								$('.active .search-results').html('<span class="not-found">Item not found</span>').show();
							}
							// Remove hint
				        	$('.active input.food').removeClass('searching');
				        } else {
				        	// Remove old search from queue
							context.search_queue.splice(_.indexOf(context.search_queue, response.term), 1);
						}
				}
			});
	},
	
	// Get food info by name
	get_food: function(name) {
		$.ajax( {
			type: "POST",
			url: endpoints.get_food,
			data: {name: name},
			success: function( response ) {
				console.log(response);
			}
		});
	},

	// Add a meal asynchronously
	post_meal: function() {
		// Serialize form data
		var form_data = $('#add-meal form').serializeArray();
		// Set hint
		$('#add-meal .submit').addClass('saving');
		$.ajax( {
			type: "POST",
			url: endpoints.add_meal,
			data: form_data,
			success: function( response ) {
				// Remove saved food and add a fresh input
				$('.food-container').remove();
				$($( "#food-template" ).html()).insertBefore('#add-meal-item');
				// Remove hint
				$('#add-meal .submit').removeClass('saving');
			}
		});	
	},

	// Gets meals between two dates
	get_meals: function() {
		// Serialize form data
		var form_data = $('#review form').serializeArray();
		// Set hint
		$('#review .submit').addClass('saving');
		var context = this;
		$.ajax({
			type: 'POST',
			url: endpoints.get_meals,
			data: form_data,
			success: function(response) {
				// Remove hint
				$('#review .submit').removeClass('saving');
				// Render review
				context.render_review(response);
			}
		}); 
	},
	
	// Deletes meal of specified ID
	delete_meal: function(id) {
		// Set hint
		$('#review .delete').addClass('saving');
		var context = this;
		$.ajax({
			type: 'POST',
			url: endpoints.delete_meal,
			data: {id: id},
			success: function(response) {
				// Remove hint
				$('#review .submit').removeClass('saving');
				// Remove HTML
				$('#'+id).remove();
			}
		}); 
	},
	
	render_review: function(data) {
		//$('#total-calories').html(data.calories);
		var template = _.template( $( "#review-template" ).html() );
		//console.log(data);
		$('#review-content').html(template(data));
	},
	
	// Initiate function binds all events used in the interface
	init: function() {
		
		console.log('Init');
		
		var context = this;
		
		/* When selecting a meal in the review section show options for updating, duplicating and deleting */
		$('#review').on('click', '.review-meal-item', function(e) {
			if(!$(this).hasClass('editing')) {
				var html = '<div class="meal-options"><a class="duplicate-btn btn">Duplicate</a><a class="revise-btn btn">Revise</a><a class="delete-btn btn">Delete</a></div>';
				$(this).addClass('editing');
				$(this).append(html);
			}
		});
		
		/* Delete meal */
		$('#review').on('click', '.delete-btn', function(e) {
			var id = $(this).closest('.review-meal-item').attr('id');
			context.delete_meal(id);
		});
		
		/* When selecting a food from search results update value and food id and render unit selector */
		$('#add-meal').on('click', '.search-result-item', function() {
			var data_id = parseInt($(this).attr('data-id'));
			$('.active .food').attr('data-id', data_id);
			$('.active .food').val($(this).text());
			var template = _.template( $( "#unit-template" ).html() );
			var food_item = _.findWhere(food.last_query.foods, {id: data_id});
			$('.active .unit select').html(template(food_item));
		});
		
		/* When typing a search term call search function at intervals */
		$('#add-meal').on('input', '.food', function(e) {
			if($(this).val() != '' && $(this).val() != ' ' && $(this).val().length > 1) {
				context.search_interval = setInterval(context.search_foods($(this)), 1500);
			} else {
				$('.active .search-results').hide();	
				$('.active .food').removeClass('searching');
			}
		});
		
		/* When focusing on search input, set container as active and reset children */
		$('#add-meal').on('focus', '.food', function(e) {
			$(this).parent().addClass('active');
			$(this).empty();
			$(this).val('');
			$(this).attr('data-id', '');
			$('.active .unit select').empty();
		});
		
		/* When clicking away from search input make sure we have a valid food or reset */
		$('#add-meal').on('blur', '.food', function(e) {
			setTimeout(function(){
				if($('.active .food').attr('data-id') == '') {
					$(e.target).val('');
				}
				$('.active').removeClass('active');
				$('.search-results').hide();
				clearInterval(context.search_interval); 
			}, 200);
		});
		
		/* Auto set add meal date to todays date */
		var current_date = new Date(); 
		var month =((current_date.getMonth()+1)>=10)? (current_date.getMonth()+1) : '0' + (current_date.getMonth()+1);  
		var day =((current_date.getDate())>=10)? (current_date.getDate()) : '0' + (current_date.getDate());
		var year = current_date.getFullYear().toString();
		var todays_date = month + '/' + day + "/" + year; 
		$('#add-meal input[name="date"]').val(todays_date);
		$('#review .datepicker').val(todays_date);
		
		
		/* Add new food item to meal */
		$('#add-meal-item').click(function() { 
			var template = _.template($( "#food-template" ).html());
			$(template()).insertBefore('#add-meal-item');
		});
		
		/* Remove food item from meal */
		$('#add-meal').on('click', '.remove', function() {
			$(this).parent().remove();
		});
		
		/* Update meal */
		$('#review').on('click', '.revise-btn', function(e) {
			var meal_elem = $(this).closest('.review-meal-item');
			/* Build meal object for template */
			var meal = {};
			meal.id = meal_elem.attr('id');
			meal.type = meal_elem.find('h6').html();
			meal.date = meal_elem.find('.date').html();
			meal.food = [];
			meal_elem.find('.review-food').each(function(index, food) {
				/* Convert food html to a food object and add it to the meal object */
				var clone = {};
				clone.name = $(food).find('.food').html();
				clone.amount = $(food).find('.amount').html();
				clone.unit = $(food).find('.unit').html();
				meal.food.push(clone);
			});
			/* Clear add-meal section and insert meal to be updated */
			$('#add-meal .food-container').remove();
			$('#add-meal .for-container select option[value="' + meal.type + '"]').prop({'selected' : true});
			$('#add-meal .when-container input[name="date"]').val(meal.date);
			var template = _.template($( "#update-food-template" ).html());
			$(template(meal)).insertBefore('#add-meal-item');
			/* Render units */
			$('#add-meal .unit select').each(function(index, object) {
				$(this).html('<option>' + $(this).html() + '</option>');							
			});
			
		});
		
		
		/* Validate ADD MEAL form, concact all foods and amounts and submit */
		$('#add-meal form').submit(function(e){
			e.preventDefault();
			if($('#add-meal .food').val() == '' || $('#add-meal input[name="date"]').val() == '' || $('#add-meal input[name="type"]').val() == '' || $('#add-meal .amount').val() == '') {
				alert('All fields are required');
			} else {
				/* Remove empty food containers */
				$('#add-meal .food').each(function() {
					if($(this).val() == '') {
						$(this).closest('.food-container').remove();	
					}
				});
				context.post_meal();
			}
		});
		
		
		/* Validate REVIEW form and request asynchrnously */
		$('#review form').submit(function(e){
			e.preventDefault();
			if($('#review #starting-date').val() == '' || $('#review #ending-date').val() == '') {
				alert('All fields are required');
			} else {
				context.get_meals();
			}
		});;
	}
	
};

food.init(); 

})($)




