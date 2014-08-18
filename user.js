

var asUser = function(movable, floorCount, floorHeight) {
    movable.currentFloor = 0;
    movable.destinationFloor = 0;
    movable.done = false;
    movable.removeMe = false;

    movable.appearOnFloor = function(floor, destinationFloorNum) {
        var floorPosY = (floorCount - 1) * floorHeight - floor.level * floorHeight + 30;
        movable.currentFloor = floor.level;
        movable.destinationFloor = destinationFloorNum;
        movable.moveTo(null, floorPosY);
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
            movable.trigger("entered_elevator", elevator);

            movable.moveToOverTime(pos[0], pos[1], 1000, undefined, function() {
                elevator.pressFloorButton(movable.destinationFloor);
            });

            var exitAvailableHandler = function(floorNum) {
                if(elevator.currentFloor === movable.destinationFloor) {
                    elevator.userExiting(movable);
                    movable.currentFloor = elevator.currentFloor;
                    movable.setParent(null);
                    var destination = movable.x + 100
                    movable.moveToOverTime(destination, null, 1000 + Math.random()*500, linearInterpolate, function() {
                        movable.trigger("removable");
                        movable.off("*");
                    });
                    movable.done = true;
                    movable.trigger("exited_elevator", elevator);

                    // Remove self as event listener
                    elevator.off("exit_available", exitAvailableHandler);
                }
            };
            elevator.on("exit_available", exitAvailableHandler);
        } else {
            movable.pressFloorButton(floor);
        }
    };

    return movable;
}