{
    /**
     * For Level 17:
     * Transported: 1991
     * Elapsed time: 1001s
     * Transported/s: 1.99
     * Avg waiting time: 6.4s
     * Max waiting time: 19.9s
     * Moves: 10828
     */ 
    name: 'Dustin\'s Solution',
    url: 'https://gist.github.com/dustinbarnes/7944c85e24011105c7c9',
    init: function(elevators, floors) {
        var minimal_load = 0;
        var up_queue = [];
        var down_queue = [];
 
        elevators.forEach(function(elevator) {
            elevator.on("idle", function() {
                // By default, do nothing.
                var floor = elevator.currentFloor();
 
                if ( down_queue.length > 0 ) {
                    floor = down_queue.pop();
                } else if ( up_queue.length > 0 ) {
                    floor = up_queue.pop();
                }
 
                elevator.goToFloor(floor);
            });
 
            elevator.on("floor_button_pressed", function(floorNum) {
                elevator.goToFloor(floorNum);
            });
 
 
            elevator.on("stopped_at_floor", function(floorNum) {
                if ( elevator.loadFactor() < minimal_load ) {
                    elevator.goToFloor(floorNum, true);
                }
            });
 
            elevator.on("passing_floor", function(floorNum, direction) {
                var queue = elevator.destinationQueue;
 
                // Can we stop at this floor?
                if ( !isFull(elevator) ) {
                    var up = up_queue.indexOf(floorNum);
                    var down = down_queue.indexOf(floorNum);
 
                    // if we're going up and they're going up...
                    if ( direction == "up" && up > -1 ) {
                        up_queue.splice(up, 1);
                        queue.push(floorNum);
                    } else if ( direction == "down" && down > -1 ) {
                        down_queue.splice(down, 1);
                        queue.push(floorNum)
                    }
                }
 
                // De-dupe
                queue = _.uniq(queue);
 
                // Sort it. Floors in same direction first, nearest first.
                queue.sort(function(left, right) {
                    // If either of these are the floor we're "passing", that wins.
                    if ( left == floorNum && right != floorNum ) return -1;
                    if ( left != floorNum && right == floorNum ) return 1;
 
                    if ( direction == "down" ) {
                        if ( left < floorNum && right < floorNum ) return left - right;
                        if ( left > floorNum && right > floorNum ) return left - right;
                        if ( left < floorNum && right > floorNum ) return -1;
                        if ( left > floorNum && right < floorNum ) return 1;
                    } else {
                        if ( left < floorNum && right < floorNum ) return left - right;
                        if ( left > floorNum && right > floorNum ) return left - right;
                        if ( left < floorNum && right > floorNum ) return 1;
                        if ( left > floorNum && right < floorNum ) return -1;
                    }
 
                    // fallthrough -- equal.
                    return 0;
                });
 
                // Let's push it back in
                elevator.destinationQueue = queue;
                elevator.checkDestinationQueue();
            });
        });
 
 
        floors.forEach(function(floor) {
            floor.on("up_button_pressed", function() {
                up_queue.push(floor.floorNum());
            });
 
            floor.on("down_button_pressed", function() {
                down_queue.push(floor.floorNum());
            });
        });
 
        var isFull = function(elevator) { return elevator.loadFactor() >= 0.7; };
 
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}