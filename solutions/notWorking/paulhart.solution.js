{
    name: 'paulhart\'s relatively naive solution',
    url: 'https://github.com/magwo/elevatorsaga/wiki/paulhart%27s-relatively-naive-solution-%28all-challenges%29',
    init: function(elevators, floors) {
        for(var e = 0; e < elevators.length; e++) {
            var elevator = elevators[e];
            elevator.on("idle", function() {
                if(floors[0].waiting.length > 0) {
                    this.goToFloor(floors[0].waiting.shift());
                }
            });
            elevator.on('floor_button_pressed', function(floorNum) {
                if(this.destinationQueue.indexOf(floorNum) == -1) {
                    this.goToFloor(floorNum);
                }
            });
            elevator.on('passing_floor', function(floorNum, direction) {
                var switched = false;
                var idx = this.destinationQueue.indexOf(floorNum);
                if(idx != -1) {
                    this.destinationQueue.splice(idx, 1); // remove the floor from the list
                    this.destinationQueue.unshift(floorNum); // put it at the front
                    this.checkDestinationQueue(); // oh, we've changed things.
                    switched = true;
                }
                if(switched && floors[0].waiting.indexOf(floorNum) != -1) {
                    // remove from here too, because we're stopping already...
                    floors[0].waiting.splice(floors[0].waiting.indexOf(floorNum), 1);
                }
                if(!switched && (floors[0].waiting.indexOf(floorNum) != -1)) {
                    // Add to this list from that list...
                    console.log('picking up waiters from '+floorNum);
                    floors[0].waiting.splice(floors[0].waiting.indexOf(floorNum), 1);
                    this.destinationQueue.unshift(floorNum);
                    this.checkDestinationQueue();
                    console.log('people waiting on '+floors[0].waiting);
                }
            });
            elevator.on('stopped_at_floor', function(floorNum) {
            });
        }
        floors[0].waiting = []; // Storage for all floors that have things going on...
        floors[0].respondToButton = function(floor) {
            // First, look to see if any elevators are going there already, or if not, if someone is free...
            for(var e = 0; e < elevators.length && searching; e++) {
                if(elevators[e].destinationQueue.length == 1 && elevators[e].destinationQueue[0] == floor.floorNum()) {
                    // we're already going here, never mind...
                    return;
                }
                if(elevators[e].destinationQueue.length == 0) {
                    elevators[e].goToFloor(floor.floorNum());
                    //searching = false;
                    return;
                }
            }
            // Regardless, add it to the list of places to visit soon.
            if(floors[0].waiting.indexOf(floor.floorNum()) == -1) {
                floors[0].waiting.push(floor.floorNum());
            }
            console.log('people waiting on ' + floors[0].waiting);
        };
        for(var f = 0; f < floors.length; f++) {
            var floor = floors[f];
            floor.on('up_button_pressed', function() {
                floors[0].respondToButton(this);
            });
            floor.on('down_button_pressed', function() {
                floors[0].respondToButton(this);
            });
        }
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}