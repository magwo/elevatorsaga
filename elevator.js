

var asElevator = function(movable, speedFloorsPerSec, floorCount, floorHeight) {
    movable.currentFloor = 0;
    movable.destinationFloor = 0;
    movable.inTransit = false;

    movable.setFloorPosition = function(floor) {
        movable.moveTo(null, floor * floorHeight);
        movable.currentFloor = floor;
        movable.destinationFloor = floor;
        movable.inTransit = false;
        movable.onNewState();
    }

    movable.goToFloor = function(floor, cb) {
        if(movable.inTransit) {
            throw "Can not move to new floor while in transit";
        }
        movable.inTransit = true;
        movable.destinationFloor = floor;
        var distance = Math.abs(movable.destinationFloor - movable.currentFloor);
        var timeToTravel = 1000.0 * distance / speedFloorsPerSec;
        var destination = (floorCount - 1) * floorHeight - floor * floorHeight;

        movable.moveToOverTime(null, destination, timeToTravel, undefined, function() {
            movable.currentFloor = movable.destinationFloor;
            movable.onNewCurrentFloor();
            movable.onStoppedAtFloor();
            movable.inTransit = false;
            if(cb) { cb(movable); }
        });
    }

    movable.onNewState(function() {
        // Recalculate the floor number
        var currentFloor = Math.round(((floorCount - 1) * floorHeight - movable.y) / floorHeight);
        if(currentFloor != movable.currentFloor) {
            movable.currentFloor = currentFloor;
            movable.onNewCurrentFloor();
        }
    });

    movable = asEmittingEvent(movable, "onStoppedAtFloor");
    movable = asEmittingEvent(movable, "onNewCurrentFloor");

    return movable;
}