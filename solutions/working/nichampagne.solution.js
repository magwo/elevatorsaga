{
        name: 'Solution with working lights!|nichampagne\'s Solution',
        url: 'https://github.com/magwo/elevatorsaga/wiki/nichampagne\'s-Solution-w--Working-Lights!',
    init: function(elevators, floors) {
        var goingUp = [];    //ARRAY OF FLOORS WITH UP BUTTON PRESSED, KEPT IN ORDER OF WHEN THEY WERE PRESSED
        var goingDown = [];  //ARRAY OF FLOORS WITH DOWN BUTTON PRESSED, KEPT IN ORDER OF WHEN THEY WERE PRESSED
        var topFloor = floors.length - 1; //THE FLOOR NUMBER OF THE TOP FLOOR, BECAUSE IT CHANGES ON DIFFERENT CHALLENGES
        var next = 0;        //A PLACE HOLDER VARIABLE USED IN A FEW PLACES
        
        // FLOOR BUTTON PRESS LISTENER
        _.each(floors, function(floor) {                        //FOR EACH FLOOR
            floor.on("up_button_pressed", onFloorUp);           //IF UP, DO ONFLOORUP
            floor.on("down_button_pressed", onFloorDown);       //IF DOWN, DO ONFLOORDOWN
        
            function onFloorUp() {
                goingUp.push(this.floorNum());                  //ADD FLOORNUM TO END OF GOINGUP QUEUE LIST
            }
            function onFloorDown() {
                goingDown.push(this.floorNum());                //ADD FLOORNUM TO END OF GOINGDOWN QUEUE LIST
            }
        }); 
        // END - FLOOR BUTTON PRESS LISTENER
        
        
        // ELEVATOR LOGIC SECTION
        _.each(elevators, function(elevator) {
            
            // ELEVATOR IDLE SECTION - DO WHEN ELEVATOR DESTINATION QUEUE IS EMPTY
            // YOU CAN ONLY DO ONE ACTION IN IDLE, EVERYTHING MUST BE IN AN ELSE IF
            elevator.on("idle", function() {
                
                elevator.goingUpIndicator(false);          //SIGNAL IDLE BY TURNING OFF BOTH LIGHTS
                elevator.goingDownIndicator(false);
                
                if (goingDown.length > 0) {                //FIRST - IF THERE IS A DOWN BUTTON PRESSED                              
                    elevator.goingDownIndicator(true);     //SET DOWN INDICATOR LIGHT ON
                    
                    var downcopy = goingDown;                //GET HIGHEST FLOOR WITH DOWN REQUEST
                    downcopy.sort(function(a, b){return b-a});
                    next = downcopy.shift();
                    goingDown.splice(next, 1);
                    
                    elevator.goToFloor(next);              //GO TO REQUESTED FLOOR                   
                    
                } else if (goingUp.length > 0) {           //DOWN QUEUE IS EMPTY, CHECK UP QUEUE, IF NOT EMPTY
                    elevator.goingUpIndicator(true);       //SET UP INDICATOR ON
                    next = goingUp.shift();                //GET OLDEST UP REQUEST AND REMOVE FROM QUEUE
                    elevator.goToFloor(next);              //GO TO REQUESTED FLOOR 
                } else {                                   //UP AND DOWN QUEUE ARE EMPTY, SO...
                    elevator.stop();                       //STOP HERE (CLEARS DESITNATION QUEUE AS WELL)
                    elevator.goingUpIndicator(true);       //TURN ON BOTH LIGHTS (INCASE SOMEONE APPEARS ON THIS FLOOR)
                    elevator.goingDownIndicator(true);
                }
            }); 
            // END ELEVATOR IDLE SECTION
            
            
            // ELEVATOR FLOOR BUTTON PRESSED - TRIGGERED WHEN PASSENGER ENTERS CAR AND PRESSES FLOOR BUTTON
            // NOTE : PASSENGERS ONLY ENTER AND PRESS WHEN INDICATOR LIGHT IS GOING DIRECTION THEY WANT
            // SO IT IS UNLIKELY THAT A DESTINATION WILL BE ADDED IN OPPOSITE DIRECTION OF TRAVEL
            elevator.on("floor_button_pressed", function(floorNum) {         //EVENT - PASSENGER ENTERED AND PRESSED BUTTON
                if (elevator.destinationQueue.indexOf(floorNum) < 0 ) {      //CHECK IF FLOORNUM IS NOT IN DESTINATION QUEUE ALREADY
                    elevator.destinationQueue.push(floorNum);                //ADD FLOORNUM TO END OF DESTINATION QUEUE
                }
                
                //DIRECTION CHECK AND DESTINATION QUEUE REORDERING
                if (elevator.goingUpIndicator() && !elevator.goingDownIndicator()) {            //IF LIGHTS SAY [UP(ON) DOWN(OFF)] - WE'RE GOING UP
                    elevator.destinationQueue.sort(function(a, b){return a-b});                 //SORT DEST QUEUE IN ASCENDING ORDER
                } else if (!elevator.goingUpIndicator() && elevator.goingDownIndicator()) {     //ELSE IF LIGHTS SAY [UP(OFF) DOWN(ON)] - WE'RE GOING DOWN
                    elevator.destinationQueue.sort(function(a, b){return b-a});                 //SORT DEST QUEUE IN DESCENDING ORDER
                                                                                                //ELSE WE'RE STOPPED AT END OF IDLE SECTION [UP(ON) DOWN(ON)]
                } else if (elevator.destinationQueue[0] > elevator.currentFloor()) {            //MOST LIKELY ONLY ONE PASSENGER, IF FIRST DEST > CURRENT FLOOR 
                    elevator.goingDownIndicator(false);                                         //TURN OFF DOWN LIGHT (UP IS STILL ON), WE'RE GOING UP
                                                                                                //CHECK FOR CURRENT FLOOR IN GOINGUP QUEUE
                    if (goingUp.indexOf(elevator.currentFloor()) >= 0) {                        //IF PRESENT IN THE QUEUE
                        goingUp.splice(goingDown.indexOf(elevator.currentFloor()), 1);          //CUT IT OUT OF THE QUEUE
                    } else {                                                                    //ELSE
                        elevator.goingUpIndicator(false);                                       //TURN OFF UP LIGHT (DOWN STILL ON), WE'RE GOING DOWN
                        //index = goingDown.indexOf(elevator.currentFloor());                   //CHECK FOR CURRENT FLOOR IN GOINGDOWN QUEUE
                        if (goingDown.indexOf(elevator.currentFloor()) >= 0) {                  //IF PRESENT IN THE QUEUE
                            goingDown.splice(goingDown.indexOf(elevator.currentFloor()), 1);    //CUT IT OUT OF THE QUEUE
                        }
                    }
                }
                                                                                                //QUEUE SHOULD BE SORTED TO SEND US IN DIRECTION MATCHING OUR LIGHT
                elevator.checkDestinationQueue();                                               //CHECK QUEUE FOR NEXT DESTINATION, AND GO!
            });
            // END - FLOOR BUTTON PRESSED SECTION
            
            
            // ELEVATOR PASSING FLOOR
            elevator.on("passing_floor", function(floorNum, direction) {
                
                //CHECK IF FLOOR WE'RE PASSING GOING UP IS IN GOINGUP QUEUE
                if (direction == "up" && elevator.goingUpIndicator()) {                   //IF WE'RE GOING UP AND UP INDICATOR IS ON (NOT NEEDED?)
                    if (goingUp.indexOf(floorNum) >= 0 && elevator.loadFactor() < 0.6) {  //IF FLOOR IS IN QUEUE AND WE'RE LESS THAN 60% FULL
                        goingUp.splice(goingUp.indexOf(floorNum), 1);                     //CUT THIS FLOOR OUT OF THE GOINGUP QUEUE (DO THIS FIRST!)
                        elevator.goToFloor(floorNum, true);                               //STOP AT THIS FLOOR BEFORE WE DO ANYTHING ELSE
                    }
                }
                if (direction == "down" && elevator.goingDownIndicator()) {                //IF WE'RE GOING DOWN AND THE DOWN INDICATOR IS ON (NOT NEEDED?)
                    if (goingDown.indexOf(floorNum) >= 0 && elevator.loadFactor() < 0.6) { //IF FLOOR IS IN QUEUE AND ELEVATOR IS LESS THAN 60% FULL
                        goingDown.splice(goingDown.indexOf(floorNum), 1);                  //CUT THIS FLOOR OUT OF GOINGDOWN QUEUE (DO FIRST!)
                        elevator.goToFloor(floorNum, true);                                //STOP AT THIS FLOOR BEFORE DOING ANYTHING ELSE
                    }
                }
            });
            // END ELEVATOR PASSING FLOOR SECTION
            
            
            // ELEVATOR STOPPED AT FLOOR
            // LIGHT INDICATOR MANAGEMENT
            elevator.on("stopped_at_floor", function(floorNum) {        
                
                //SPECIAL CASE LIGHT MANAGEMENT
                if (floorNum == 0) {                                    //IF WE'RE AT THE BOTTOM FLOOR
                    elevator.goingDownIndicator(false);                 //TURN OFF DOWN LIGHT
                    elevator.goingUpIndicator(true);                    //TURN ON UP LIGHT
                } else if (floorNum == topFloor) {                      //IF WE'RE AT THE TOP FLOOR
                    elevator.goingUpIndicator(false);                   //TURN OFF UP LIGHT
                    elevator.goingDownIndicator(true);                  //TURN ON DOWN LIGHT
                }
            });
            // END ELEVATOR STOPPED AT FLOOR SECTION
        });
        // END ELEVATOR LOGIC SECTION
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}