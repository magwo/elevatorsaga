
// Interface that hides actual elevator object behind a more robust facade,
// while also exposing relevant events, and providing some helper queue
// functions that allow programming without async logic.
var asElevatorInterface = function(obj, elevator, floorCount) {
    var elevatorInterface = riot.observable(obj);

    elevatorInterface.destinationQueue = [];

    elevatorInterface.checkDestinationQueue = function() {
        if(!elevator.isBusy()) {
            if(elevatorInterface.destinationQueue.length) {
                elevator.goToFloor(_.first(elevatorInterface.destinationQueue));
            } else {
                elevatorInterface.trigger("idle");
            }
        }
    };

    // TODO: Write tests for this queueing logic
    elevatorInterface.goToFloor = function(floorNum, forceNow) {
        floorNum = limitNumber(Number(floorNum), 0, floorCount - 1);
        // Auto-prevent immediately duplicate destinations
        if(elevatorInterface.destinationQueue.length) {
            var adjacentElement = forceNow ? _.first(elevatorInterface.destinationQueue) : _.last(elevatorInterface.destinationQueue);
            if(epsilonEquals(floorNum, adjacentElement)) {
                return;
            }
        }
        elevatorInterface.destinationQueue[(forceNow ? "unshift" : "push")](floorNum);
        elevatorInterface.checkDestinationQueue();
    };

    elevatorInterface.stop = function() {
        elevatorInterface.destinationQueue = [];
        elevatorInterface.goToFloor(elevator.getExactFutureFloorIfStopped());
    }

    elevatorInterface.getFirstPressedFloor = function() { return elevator.getFirstPressedFloor(); };
    elevatorInterface.currentFloor = function() { return elevator.currentFloor; };
    elevatorInterface.loadFactor = function() { return elevator.getLoadFactor(); };
    elevatorInterface.goingUpIndicator = createBoolPassthroughFunction(elevatorInterface, elevator, "goingUpIndicator");
    elevatorInterface.goingDownIndicator = createBoolPassthroughFunction(elevatorInterface, elevator, "goingDownIndicator");

    elevator.on("stopped", function(position) {
        if(elevatorInterface.destinationQueue.length && epsilonEquals(_.first(elevatorInterface.destinationQueue), position)) {
            // Reached the destination, so remove element at front of queue
            elevatorInterface.destinationQueue = _.rest(elevatorInterface.destinationQueue);
            if(elevator.isOnAFloor()) {
                elevator.wait(1, function() {
                    elevatorInterface.checkDestinationQueue();
                });
            } else {
                elevatorInterface.checkDestinationQueue();
            }
        }
    });

    elevator.on("passing_floor", function(floorNum, direction) {
        elevatorInterface.trigger("passing_floor", floorNum, direction);
    });

    elevator.on("stopped_at_floor", function(floorNum) {
        elevatorInterface.trigger("stopped_at_floor", floorNum);
    });
    elevator.on("floor_button_pressed", function(floorNum) {
        elevatorInterface.trigger("floor_button_pressed", floorNum);
    });

    return elevatorInterface;
}