{
    name: 'Alber70g\'s solution',
    url: 'https://github.com/magwo/elevatorsaga/wiki/Solution-by-alber70g',
    init: function(elevators, floors) {
        var floorsWithPassengersDown = [];
        var floorsWithPassengersUp = [];

        for (var e = 0; e < elevators.length; e++){
            elevators[e].on("idle", function() {
                var floorsWithPassengers = floorsWithPassengersDown.concat(floorsWithPassengersUp);
                // go to a floor with passengers
                if(floorsWithPassengers.length > 0){
                    var floorNumber = floorsWithPassengers[0];
                    removeFloorFromPassengersOnFloor(floorNumber);
                    this.goToFloor(floorNumber);
                } else {
                    this.goToFloor(0);
                }
            });

            elevators[e].on("passing_floor", function(floorNum, direction) {
                // below 0.7 there might be place for another passenger
                if(this.loadFactor() < 0.7){

                    if(direction === "up"){
                        // if the elevator is going UP
                        // we only pick up from floors where people want to go UP
                        if(passengersOnFloorUp(floorNum)){
                            // if there are passengers, make next stop that floor
                            this.destinationQueue.unshift(floorNum);
                            this.checkDestinationQueue();
                            // dont let other elevators go there
                            removeFloorFromPassengersOnFloor(floorNum);
                        }
                    }

                    if(direction === "down"){
                        // if the elevator is going DOWN
                        // we only pick up from floors where people want to go DOWN
                        if(passengersOnFloorDown(floorNum)){
                            // if there are passengers, make next stop that floor
                            this.destinationQueue.unshift(floorNum);
                            this.checkDestinationQueue();
                            // dont let other elevators go there
                            removeFloorFromPassengersOnFloor(floorNum);
                        }
                    }
                }
            });

            elevators[e].on("floor_button_pressed", function(floorNum) {
                // @todo: SORT the destinationQueue starting at the current floor, in direction that we are moving first
                // That is: direction: down, currentfloor: 3
                // Order: 2 1 0 1 2 3 4 5 (etc.)
                this.destinationQueue.push(floorNum);
                this.checkDestinationQueue();
            });
        }

        for(var f = 0; f < floors.length; f++){
            floors[f].on('up_button_pressed', function(){
                // register passengers that want to go UP
                floorsWithPassengersUp.push(this.level);
            });

            floors[f].on('down_button_pressed', function(){
                // register passengers that want to go DOWN
                floorsWithPassengersDown.push(this.level);
            });
        }

        function passengersOnFloorUp(floorNumber){
            // Are there passengers on the floor that want to go UP
            for(var i = 0; i < floorsWithPassengersUp.length; i++){
                if(floorsWithPassengersUp[i] == floorNumber){
                    return true;
                }
            }
        }

        function passengersOnFloorDown(floorNumber){
            // Are there passengers on the floor that want to go DOWN
            for(var i = 0; i < floorsWithPassengersDown.length; i++){
                if(floorsWithPassengersDown[i] == floorNumber){
                    return true;
                }
            }
        }

        function removeFloorFromPassengersOnFloor(floorNumber){
            // Remove the floor from registration
            for(var i = 0; i < floorsWithPassengersDown.length; i++){
                if(floorsWithPassengersDown[i] == floorNumber){
                    floorsWithPassengersDown.splice(i,1);
                }
            }

            for(var j = 0; j < floorsWithPassengersUp.length; j++){
                if(floorsWithPassengersUp[j] == floorNumber){
                    floorsWithPassengersUp.splice(j,1);
                }
            }
        }
    },
    update: function(dt, elevators, floors) {
    }
}