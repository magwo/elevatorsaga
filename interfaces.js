
// Interface that hides actual elevator object behind a more robust facade,
// while also exposing relevant events, and providing some helper queue
// functions that allow programming without async logic.
var asElevatorInterface = function(obj, elevator, floorCount) {
    riot.observable(obj);

    obj.destinationQueue = [];

    obj.checkDestinationQueue = function() {
        if(!elevator.isBusy()) {
            if(obj.destinationQueue.length) {
                elevator.goToFloor(_.first(obj.destinationQueue));
            } else {
                obj.trigger("idle");
            }
        }
    };

    obj.goToFloor = function(floorNum) {
        floorNum = limitNumber(Number(floorNum), 0, floorCount - 1);
        // Auto-prevent immediately duplicate destinations
        if(obj.destinationQueue.length && epsilonEquals(_.first(obj.destinationQueue), floorNum)) {
            return;
        }
        obj.destinationQueue.push(floorNum);
        obj.checkDestinationQueue();
    };

    obj.stop = function() {
        obj.destinationQueue = [];
        obj.goToFloor(elevator.getExactFutureFloorIfStopped());
    }

    obj.getFirstPressedFloor = function() { return elevator.getFirstPressedFloor(); };
    obj.currentFloor = function() { return elevator.currentFloor; };
    obj.loadFactor = function() { return elevator.getLoadFactor(); };

    elevator.on("stopped", function(position) {
        if(obj.destinationQueue.length && epsilonEquals(_.first(obj.destinationQueue), position)) {
            // Reached the destination, so remove element at front of queue
            obj.destinationQueue = _.rest(obj.destinationQueue);
            if(elevator.isOnAFloor()) {
                elevator.wait(1, function() {
                    obj.checkDestinationQueue();
                });
            } else {
                obj.checkDestinationQueue();
            }
        }
    });

    elevator.on("stopped_at_floor", function(floorNum) {
        obj.trigger("stopped_at_floor", floorNum);
    });
    elevator.on("floor_button_pressed", function(floorNum) {
        obj.trigger("floor_button_pressed", floorNum);
    });

    return obj;
}