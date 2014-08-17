

var asUser = function(movable, floorCount, floorHeight) {
    movable.currentFloor = 0;
    movable.destinationFloor = 0;
    movable.done = false;
    movable.removeMe = false;

    movable.appearOnFloor = function(floor, destinationFloorNum) {
        var floorPosY = (floorCount - 1) * floorHeight - floor.level * floorHeight + 30;
        movable.moveTo(null, floorPosY);
        movable.currentFloor = floor.level;
        movable.destinationFloor = destinationFloorNum;
        movable.pressFloorButton(floor);
    };

    movable.pressFloorButton = function(floor) {
        if(movable.destinationFloor < movable.currentFloor) {
            floor.pressDownButton();
        } else {
            floor.pressUpButton();
        }
    }

    movable.elevatorAvailable = function(elevator, floor) {
        if(movable.done || movable.parent !== null) {
            return;
        }
        
        var pos = elevator.userEntering(movable);
        if(pos) {
            // Success
            movable.setParent(elevator);
            movable.onEnteredElevator();

            movable.moveToOverTime(pos[0], pos[1], 1000, undefined, function() {
                elevator.pressFloorButton(movable.destinationFloor);
            });


            elevator.onExitAvailable(function(elev, self) {
                if(elevator.currentFloor === movable.destinationFloor) {
                    elev.userExiting(movable);
                    movable.currentFloor = elevator.currentFloor;
                    movable.setParent(null);
                    var destination = movable.x + 100
                    movable.moveToOverTime(destination, null, 1000 + Math.random()*500, linearInterpolate, function() {
                        movable.onRemovable();
                    });
                    movable.done = true;
                    movable.onExitedElevator();

                    // Remove self as event listener
                    elev.remove_onStoppedAtFloor(self);
                }
            });
        } else {
            movable.pressFloorButton(floor);
        }
        
    };

    asEmittingEvent(movable, "onEnteredElevator");
    asEmittingEvent(movable, "onExitedElevator");
    asEmittingEvent(movable, "onRemovable");

    return movable;
}