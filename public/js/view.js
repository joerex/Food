
var search_foods = function(context) {
	var term = $(context).val().trim();
	$.ajax({
		type: 'GET',
		url: 'http://joereckley.com/sandbox/food/search.php?search=' + term,
		success: function(response) {
				var results_box = context.siblings('.search-results');
				results_box.html(response);
				results_box.show();
				$('.search-result-item', results_box).on('click', function() {
					var food = $(this).text();
					var food_unit = $(this).attr('data-unit');
					console.log($(this).parent().siblings('input.food'));
					$(this).parent().siblings('input.food').val(food);
					$(this).parent().siblings('.unit').text(food_unit);
					valid_food_selected = true;
				});
		}
		
	});
}

var search_interval;
var valid_food_selected = false;

$('#add-meal').on('input', '.food', function(e) {
	valid_food_selected = false;
	if($(this).val() != '' && $(this).val() != ' ') {
		var context = $(this);
		search_interval = setInterval(search_foods(context), 500);
	} else {
		$('.search-results', this).hide();	
	}
});

$('#add-meal').on('blur', '.food', function(e) {
	setTimeout(function(){
		if(!valid_food_selected) {
			$(e.target).val('');
		} else {
			valid_food_selected = true;
		}
		$('.search-results').hide();
		clearInterval(search_interval); 
	}, 200);});


/* Auto set add meal date to todays date */
var current_date = new Date();
var month =((current_date.getMonth()+1)>=10)? (current_date.getMonth()+1) : '0' + (current_date.getMonth()+1);  
var day =((current_date.getDate())>=10)? (current_date.getDate()) : '0' + (current_date.getDate());
var year = current_date.getFullYear().toString();
var todays_date = month + '/' + day + "/" + year; 
$('#add-meal input[name="date"]').val(todays_date);
$('#review .datepicker').val(todays_date);



/* Toggle ADD FOOD form */
$('#add-food .drop-form').click(function() {
	if($('#add-food form:visible').length > 0) {
		$('#add-food form').slideUp();
	} else {
		$('#add-food form').slideDown();
	}
});


/* Add new food item to meal and set input names */
var food_item_count = 1;
$('#add-meal-item').click(function() { 
	food_item_count++;
	var newfood = '<div class="food-container"><label for="food_'+food_item_count+'">Food</label><input class="food" type="text" name="food_'+food_item_count+'" /><label for="amount_'+food_item_count+'">Amount</label><input class="amount" type="text" name="amount_'+food_item_count+'" value="1" /><span class="unit"></span><div class="search-results"></div></div>';
	$(newfood).insertBefore('#add-meal-item');
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
		$(this).unbind().submit();
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
});



/* Validate ADD FOOD form */
$('#add-food form').submit(function(e){
	e.preventDefault();
	/* Make sure the food has a name and a unit of measurement */
	if($('#add-food input[name="name"]').val() == ''|| $('#add-food input[name="unit"]').val() == '') {
		alert('A food name and unit of measurement is required');
	} else {
		$(this).unbind().submit();
	}
});