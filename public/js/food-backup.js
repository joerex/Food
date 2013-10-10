/*! BACKUP
 * A front-end interface for tracking meals and reviewing diet choices.
 *
 * Author: Joe Reckley (http://joereckley.com)
 * Date: 6-22-2013
 */


(function() {

var endpoints = {

	search: 'http://joereckley.com:3000/search/',
	create: 'http://joereckley.com:3000/create/',
	add_meal: 'http://joereckley.com:3000/meal/add/'
};

var food = {

	search_interval: null, 
	
	last_query: null, // Used to get more details about food without re-querying the database
	
	search_queue: [], // Search queue makes sure nothing but the most recent search is shown
	
	// This function is called at intervals if data is being typed into input.food 
	search_foods: function() {
			
			var term = $('.active input.food').val().trim();
			$('.active input.food').addClass('searching');
			this.search_queue.push(term);
			var context = this;
			$.ajax({
				type: 'GET',
				url: endpoints.search + term,
				success: function(response) {
						/* Make sure this is the latest search */
						if(_.indexOf(context.search_queue, response.term) == (context.search_queue.length-1)) {
							context.last_query = {foods: response.data};
							context.search_queue.splice(_.indexOf(context.search_queue, response.term), 1);
							var template = _.template( $( "#search-template" ).html() );
				        	$('.active .search-results').html(template({foods: response.data})).show();
				        	$('.active input.food').removeClass('searching');
				        } else {
							context.search_queue.splice(_.indexOf(context.search_queue, response.term), 1);

						}
				}
			});
	},

	// Add a meal asynchronously
	post_meal: function() {
		var form_data = $('#add-meal form').serializeArray();
		$('#add-meal .submit').addClass('saving');
		$.ajax( {
			type: "POST",
			url: endpoints.add_meal,
			data: form_data,
			success: function( response ) {
				$('#add-meal .submit').removeClass('saving');
				$('#add-meal .submit').addClass('success');
			}
		});	
	},

	// Review nutritional data about meals in between two dates
	review_meals: function() {

	},
	
	// Initiate function binds all events used in the interface
	init: function() {
		
		console.log('Init');
		
		var context = this;
		
		/* When selecting a food from search results update value and food id and render unit selector */
		$('#add-meal').on('click', '.search-result-item', function() {
			var data_id = parseInt($(this).attr('data-id'));
			$('.active .food').attr('data-id', data_id);
			$('.active .food').val($(this).text());
			var template = _.template( $( "#unit-template" ).html() );
			var food_item = _.findWhere(food.last_query.foods, {id: data_id});
			$('.active .unit').html(template(food_item));
		});
		
		/* When typing a search term call search function at intervals */
		$('#add-meal').on('input', '.food', function(e) {
			if($(this).val() != '' && $(this).val() != ' ' && $(this).val().length > 1) {
				context.search_interval = setInterval(context.search_foods($(this)), 500);
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
			$('.active .unit').empty();
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
			context.food_item_count++;
			$($( "#food-template" ).html()).insertBefore('#add-meal-item');
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
				var form_data = $(this).serialize();
				$.ajax( {
					type: "POST",
					url: $(this).attr( 'action' ) + form_data,
					success: function( response ) {
						$('#review-content').html(response);
					}
				});
			}
		});;
	}
	
};

food.init(); 

})($)




