


// Interface that hides actual elevator object behind a more robust facade,
// while also exposing relevant events, and providing some helper queue
// functions that allow programming without async logic.
var asElevatorInterface = function(obj, elevator, floorCount) {
    riot.observable(obj);

    obj.destinationQueue = [];

    obj.checkFloorQueue = function() {
        if(!elevator.isBusy()) {
            if(obj.destinationQueue.length) {
                elevator.goToFloor(obj.destinationQueue[0]);
            } else {
                obj.trigger("idle");
            }
        }
        
    }

    obj.goToFloor = function(floorNum) {
        floorNum = limitNumber(Number(floorNum), 0, floorCount - 1);
        // Auto-prevent immediately duplicate destinations
        if(obj.destinationQueue.length && obj.destinationQueue[0] === floorNum) {
            return;
        }
        obj.destinationQueue.push(floorNum);
        obj.checkFloorQueue();
    }


    obj.getFirstPressedFloor = function() { return elevator.getFirstPressedFloor(); }

    obj.currentFloor = function() { return elevator.currentFloor; }

    elevator.on("stopped", function(position) {
        if(obj.destinationQueue.length && epsilonEquals(obj.destinationQueue[0], position)) {
            // Pop front of queue
            obj.destinationQueue = obj.destinationQueue.slice(1);
            if(elevator.isOnAFloor()) {
                elevator.wait(1, function() {
                    obj.checkFloorQueue();
                });
            } else {
                obj.checkFloorQueue();
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