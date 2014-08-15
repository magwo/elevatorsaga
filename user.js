

var asUser = function(movable, floorCount, floorHeight) {
    movable.currentFloor = 0;
    movable.destinationFloor = 0;
    movable.done = false;
    movable.removeMe = false;

    movable.setFloorPosition = function(floor) {
        var destination = (floorCount - 1) * floorHeight - floor * floorHeight + 30;
        movable.moveTo(null, destination);
        movable.currentFloor = floor;
        movable.onNewState();
    };

    movable.elevatorAvailable = function(elevator) {
        if(movable.done || movable.parent !== null) {
            return;
        }
        
        var pos = elevator.userEntering(movable);
        if(pos) {
            // Success
            movable.setParent(elevator);
            movable.onEnteredElevator();

            movable.moveToOverTime(pos[0], pos[1], 1000);


            elevator.onExitAvailable(function(elev, self) {
                if(elevator.currentFloor === movable.destinationFloor) {
                    elev.userExiting(movable);
                    movable.currentFloor = elevator.currentFloor;
                    movable.setParent(null);
                    var destination = movable.x + 300
                    movable.moveToOverTime(destination, null, 2500 + Math.random()*500, linearInterpolate, function() {
                        movable.onRemovable();
                    });
                    movable.done = true;
                    movable.onExitedElevator();

                    // Remove self as event listener
                    elev.remove_onStoppedAtFloor(self);
                }
            });
        }
        
    };

    asEmittingEvent(movable, "onEnteredElevator");
    asEmittingEvent(movable, "onExitedElevator");
    asEmittingEvent(movable, "onRemovable");

    return movable;
}