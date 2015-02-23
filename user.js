

var asUser = function(user, weight, floorCount, floorHeight) {
    user.weight = weight;
    user.currentFloor = 0;
    user.destinationFloor = 0;
    user.done = false;
    user.removeMe = false;
    //user.spawnTimestamp = undefined;

    user.appearOnFloor = function(floor, destinationFloorNum) {
        var floorPosY = (floorCount - 1) * floorHeight - floor.level * floorHeight + 30;
        user.currentFloor = floor.level;
        user.destinationFloor = destinationFloorNum;
        user.moveTo(null, floorPosY);
        user.pressFloorButton(floor);
    };

    user.pressFloorButton = function(floor) {
        if(user.destinationFloor < user.currentFloor) {
            floor.pressDownButton();
        } else {
            floor.pressUpButton();
        }
    };

    user.save = function() {
        return {
                 spawnTimestamp: user.spawnTimestamp,
                 weight: user.weight,
                 spawnFloor: user.currentFloor,
                 destinationFloor: user.destinationFloor,
                 displayType: user.displayType,
                };
    };

    user.restore = function(savedUser) {
        user.weight = savedUser.weight;
        user.currentFloor = savedUser.spawnFloor;
        user.destinationFloor = savedUser.destinationFloor;
        user.displayType = savedUser.displayType;
        user.done = false;
        user.removeMe = false;
    };

    user.elevatorAvailable = function(elevator, floor) {
        if(user.done || user.parent !== null || user.isBusy()) {
            return;
        }

        if(!elevator.isSuitableForTravelBetween(user.currentFloor, user.destinationFloor)) {
            // Not suitable for travel - don't use this elevator
            return;
        }

        var pos = elevator.userEntering(user);
        if(pos) {
            // Success
            user.setParent(elevator);
            user.trigger("entered_elevator", elevator);

            user.moveToOverTime(pos[0], pos[1], 1, undefined, function() {
                elevator.pressFloorButton(user.destinationFloor);
            });

            var exitAvailableHandler = function(floorNum) {
                if(elevator.currentFloor === user.destinationFloor) {
                    elevator.userExiting(user);
                    user.currentFloor = elevator.currentFloor;
                    user.setParent(null);
                    var destination = user.x + 100;
                    user.done = true;
                    user.trigger("exited_elevator", elevator);
                    user.trigger("new_state");

                    user.moveToOverTime(destination, null, 1 + Math.random()*0.5, linearInterpolate, function() {
                        user.removeMe = true;
                        user.trigger("removed");
                        user.off("*");
                    });

                    elevator.off("exit_available", exitAvailableHandler);
                }
            };
            elevator.on("exit_available", exitAvailableHandler);
        } else {
            user.pressFloorButton(floor);
        }
    };

    return user;
};
