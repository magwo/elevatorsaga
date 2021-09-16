
// Interface that hides actual elevator object behind a more robust facade,
// while also exposing relevant events, and providing some helper queue
// functions that allow programming without async logic.
var asElevatorInterface = function(obj, elevator, floorCount, errorHandler) {
    var elevatorInterface = riot.observable(obj);

    elevatorInterface.destinationQueue = [];

    var tryTrigger = function(event, arg1, arg2, arg3, arg4) {
        try {
            elevatorInterface.trigger(event, arg1, arg2, arg3, arg4);
        } catch(e) { errorHandler(e); }
    };

    elevatorInterface.checkDestinationQueue = function() {
        if(!elevator.isBusy()) {
            if(elevatorInterface.destinationQueue.length) {
                elevator.goToFloor(_.first(elevatorInterface.destinationQueue));
            } else {
                tryTrigger("idle");
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
        if(!elevator.isBusy()) {
            elevator.goToFloor(elevator.getExactFutureFloorIfStopped());
        }
    };

    elevatorInterface.getFirstPressedFloor = function() { return elevator.getFirstPressedFloor(); }; // Undocumented and deprecated, will be removed
    elevatorInterface.getPressedFloors = function() { return elevator.getPressedFloors(); };
    elevatorInterface.currentFloor = function() { return elevator.currentFloor; };
    elevatorInterface.maxPassengerCount = function() { return elevator.maxUsers; };
    elevatorInterface.loadFactor = function() { return elevator.getLoadFactor(); };
    elevatorInterface.destinationDirection = function() {
      if(elevator.destinationY === elevator.y) { return "stopped"; }
      return elevator.destinationY > elevator.y ? "down" : "up";
    }
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
        tryTrigger("passing_floor", floorNum, direction);
    });

    elevator.on("stopped_at_floor", function(floorNum) {
        tryTrigger("stopped_at_floor", floorNum);
    });
    elevator.on("floor_button_pressed", function(floorNum) {
        tryTrigger("floor_button_pressed", floorNum);
    });

    return elevatorInterface;
};
