{
    name: 'toonvr\'s solution (v 1.2)',
    url: 'https://github.com/magwo/elevatorsaga/wiki/toonvr%27s-solution',
    init: function(elevators, floors) {
        var reorder = true; //reorder floor order to minimize moves. Keep on true 
        var minimalfilled = 0; //set to 0.6 for minimal move challenges 
        var backtozero = false; //make elevators go back to floor zero if idle or not.

        var uppressed = []; //keep track of up button presses
        var downpressed = []; //keep track of down button presses

        // loop over floors
        _.each(floors, function(floor) {
            // if an up button is pressed, add it to the list of up presses
            floor.on("up_button_pressed", function() {
                uppressed.push(floor.level);
            });

            // if a down button is pressed, add it to the list of down presses
            floor.on("down_button_pressed", function() {
                downpressed.push(floor.level);
            }); 
        });

        // loop over elevators
        _.each(elevators, function(elevator) {

            // if a button is pressed in the elevator, go to that floor (order can be changed when a floor is passed)
            elevator.on("floor_button_pressed", function(floorNum) {
                elevator.goToFloor(floorNum);
            });

            // if idle, determine the next floor to go to
            elevator.on("idle", function() {
                // compute the center floor - unused
                //var middle = Math.floor(floors.length/2);
                var floor;

                // if a down button is pressed, go to the floor where a button is pressed
                if (downpressed.length > 0) {
                    floor = downpressed.pop();
                    //inProcessDown.push(floor);
                // if an up button is pressed, go to the floor where an up button is pressed
                // this comes after the down presses, because up presses mostly occur at ground floor, where plenty of elevators pass anyway
                } else if (uppressed.length > 0){
                    floor = uppressed.pop();
                    //inProcessUp.push(floor);
                // if the variable is set to true, and no buttons are pressed, go to ground floor
                } else if (backtozero){
                    floor = 0;
                // stay on the current floor
                } else {
                    floor = elevator.currentFloor();
                }
                // go to the floor chosen above
                elevator.goToFloor(floor);
            });

            // when stopping on a floor
            elevator.on("stopped_at_floor", function() {
                // if the elevator is not sufficiently filled, stay on the current floor
                // can be used for the minimal move challenges
                if (elevator.loadFactor()<minimalfilled){
                    elevator.goToFloor(elevator.currentFloor(),true);
                }
            });

            // when passing a floor, rearrange the queue
            elevator.on("passing_floor", function(floorNum, direction) {
                var arr = elevator.destinationQueue;
                var uppressedIndex=uppressed.indexOf(floorNum);
                var downPressedIndex=downpressed.indexOf(floorNum);

                // see if someone pressed a floor button, if you're not full and you're going in the right direction add the floor to the queue
                if(elevator.loadFactor()<=0.5 && (((uppressedIndex > -1) && direction == "up") || ((downPressedIndex > -1) && direction == "down"))){
                    if (uppressedIndex > -1)
                        uppressed.splice(uppressedIndex,1);
                    if (downPressedIndex > -1)
                        downpressed.splice(downPressedIndex,1);
                    arr.push(floorNum);                
                }            

                // remove potential duplicate values from the queue               
                var i,
                len=arr.length,
                out=[],
                obj={};

                for (i=0;i<len;i++) {
                    obj[arr[i]]=0;
                }
                for (i in obj) {
                    out.push(i);
                }
                // duplicates removed

                // reorder the queue so floors on the path are first in the queue
                if(reorder){
                    out=out.sort();
                    var out2=[];
                    var out3=[];
                    if(direction == "up"){
                        for(i in out){
                            if(out[i]>=floorNum){
                                out2.push(out[i]);
                            } else {
                                out3.push(out[i]);
                            }
                        }
                    } else {
                        out = out.reverse();
                        for(i in out){
                            if(out[i]<=floorNum){
                                out2.push(out[i]);
                            } else {
                                out3.push(out[i]);
                            }
                        }
                    }
                    out = out2.concat(out3);
                }

                elevator.destinationQueue = out;
                elevator.checkDestinationQueue();
            });                        
        });
    },

    update: function(dt, elevators, floors) {
    }
}