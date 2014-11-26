

var asElevator = function(movable, speedFloorsPerSec, floorCount, floorHeight) {
    var elevator = movable;

    var ACCELERATION = floorHeight * 2.1;
    var DECELERATION = floorHeight * 2.6;
    var MAXSPEED = floorHeight * speedFloorsPerSec;

    elevator.destinationY = 0.0;
    elevator.velocityY = 0.0;
    // isMoving flag is needed when going to same floor again - need to re-raise events
    elevator.isMoving = false;

    elevator.goingDownIndicator = true;
    elevator.goingUpIndicator = true;

    elevator.currentFloor = 0;
    elevator.nextCleanlyStoppableFloor = 0;
    elevator.buttonStates = _.map(_.range(floorCount), function(e, i){ return false; });
    elevator.moveCount = 0;
    elevator.removed = false;
    elevator.userSlots = [
        {pos: [2, 30], user: null},
        {pos: [12, 30], user: null},
        {pos: [22, 30], user: null},
        {pos: [32, 30], user: null}];


    elevator.setFloorPosition = function(floor) {
        var destination = elevator.getYPosOfFloor(floor);
        elevator.currentFloor = floor;
        elevator.moveTo(null, destination);
    }

    elevator.userEntering = function(user) {
        for(var i=0; i<elevator.userSlots.length; i++) {
            var slot = elevator.userSlots[i];
            if(slot.user === null) {
                slot.user = user;
                return slot.pos;
            }
        }
        return false;
    }

    elevator.pressFloorButton = function(floorNumber) {
        floorNumber = limitNumber(floorNumber, 0, floorCount - 1);
        elevator.buttonStates[floorNumber] = true;
        elevator.trigger("floor_button_pressed", floorNumber);
        elevator.trigger("floor_buttons_changed", elevator.buttonStates);
    }

    elevator.userExiting = function(user) {
        _.each(elevator.userSlots, function(slot) {
            if(slot.user === user) {
                slot.user = null;
            }
        });
    }

    elevator.updateElevatorMovement = function(dt) {
        if(elevator.isBusy()) {
            // TODO: Consider if having a nonzero velocity here should throw error..
            return;
        }

        // Make sure we're not speeding
        elevator.velocityY = limitNumber(elevator.velocityY, -MAXSPEED, MAXSPEED);

        // Move elevator
        elevator.moveTo(null, elevator.y + elevator.velocityY * dt);

        var destinationDiff = elevator.destinationY - elevator.y;
        var directionSign = Math.sign(destinationDiff);
        var velocitySign = Math.sign(elevator.velocityY);
        if(destinationDiff !== 0.0) {
            if(directionSign === velocitySign) {
                // Moving in correct direction
                var distanceNeededToStop = distanceNeededToAchieveSpeed(elevator.velocityY, 0.0, DECELERATION);
                if(distanceNeededToStop * 1.05 < -Math.abs(destinationDiff)) {
                    // Slow down
                    // Allow a certain factor of extra breaking, to enable a smooth breaking movement after detecting overshoot
                    var requiredDeceleration = accelerationNeededToAchieveChangeDistance(elevator.velocityY, 0.0, destinationDiff);
                    var deceleration = Math.min(DECELERATION*1.1, Math.abs(requiredDeceleration));
                    elevator.velocityY -= directionSign * deceleration * dt;
                } else {
                    // Speed up (or keep max speed...)
                    var acceleration = Math.min(Math.abs(destinationDiff*5), ACCELERATION);
                    elevator.velocityY += directionSign * acceleration * dt;
                }
            } else if(velocitySign === 0) {
                // Standing still - should accelerate
                var acceleration = Math.min(Math.abs(destinationDiff*5), ACCELERATION);
                elevator.velocityY += directionSign * acceleration * dt;
            } else {
                // Moving in wrong direction - decelerate as much as possible
                elevator.velocityY -= velocitySign * DECELERATION * dt;
                // Make sure we don't change direction within this time step - let standstill logic handle it
                if(Math.sign(elevator.velocityY) !== velocitySign) {
                    elevator.velocityY = 0.0;
                }
            }
        }

        if(elevator.isMoving && Math.abs(destinationDiff) < 0.5 && Math.abs(elevator.velocityY) < 3) {
            elevator.moveTo(null, elevator.destinationY);
            elevator.velocityY = 0.0;
            elevator.isMoving = false;
            elevator.handleDestinationArrival();
        }
    }

    elevator.handleDestinationArrival = function() {
        elevator.trigger("stopped", elevator.getExactCurrentFloor());

        if(elevator.isOnAFloor()) {
            elevator.buttonStates[elevator.currentFloor] = false;
            elevator.trigger("floor_buttons_changed", elevator.buttonStates);
            elevator.trigger("stopped_at_floor", elevator.currentFloor);
            // Need to allow users to get off first, so that new ones
            // can enter on the same floor
            elevator.trigger("exit_available", elevator.currentFloor);
            elevator.trigger("entrance_available", movable);
        }
    }

    elevator.goToFloor = function(floor) {
        elevator.makeSureNotBusy();
        elevator.isMoving = true;
        elevator.destinationY = elevator.getYPosOfFloor(floor);
    }

    elevator.getFirstPressedFloor = function() {
        for(var i=0; i<elevator.buttonStates.length; i++) {
            if(elevator.buttonStates[i]) { return i; }
        }
        return 0;
    }

    elevator.isSuitableForTravelBetween = function(fromFloorNum, toFloorNum) {
        if(fromFloorNum > toFloorNum) { return elevator.goingDownIndicator; }
        if(fromFloorNum < toFloorNum) { return elevator.goingUpIndicator; }
        return true;
    }

    elevator.getYPosOfFloor = function(floorNum) {
        return (floorCount - 1) * floorHeight - floorNum * floorHeight;
    }

    elevator.getExactFloorOfYPos = function(y) {
        return ((floorCount - 1) * floorHeight - y) / floorHeight;
    }

    elevator.getExactCurrentFloor = function() {
        return elevator.getExactFloorOfYPos(elevator.y);
    }

    elevator.getDestinationFloor = function() {
        return elevator.getExactFloorOfYPos(elevator.destinationY);
    }

    elevator.getRoundedCurrentFloor = function() {
        return Math.round(elevator.getExactCurrentFloor());
    }

    elevator.getExactFutureFloorIfStopped = function() {
        var distanceNeededToStop = distanceNeededToAchieveSpeed(elevator.velocityY, 0.0, DECELERATION);
        return elevator.getExactFloorOfYPos(elevator.y - Math.sign(elevator.velocityY) * distanceNeededToStop);
    }

    elevator.isOnAFloor = function() {
        return epsilonEquals(elevator.getExactCurrentFloor(), elevator.getRoundedCurrentFloor());
    }

    elevator.getLoadFactor = function() {
        var load = _.reduce(elevator.userSlots, function(sum, slot) { return sum + (slot.user ? slot.user.weight : 0); }, 0);
        console.log(load);
        return load / 400.0;
    }


    elevator.on("new_state", function() {
        // Recalculate the floor number etc
        var currentFloor = elevator.getRoundedCurrentFloor();
        if(currentFloor != elevator.currentFloor) {
            elevator.moveCount++;
            elevator.currentFloor = currentFloor;
            elevator.trigger("new_current_floor", elevator.currentFloor);
        }

        // Check if we are about to pass a floor
        // TODO: Try to make this code simpler
        // TODO: Write tests for this code, covering any edge cases
        if(elevator.velocityY !== 0.0) {
            var nextCleanlyStoppableFloor = elevator.getExactFutureFloorIfStopped();
            nextCleanlyStoppableFloor = (elevator.velocityY > 0.0 ? Math.floor : Math.ceil)(nextCleanlyStoppableFloor);

            if(elevator.nextCleanlyStoppableFloor !== nextCleanlyStoppableFloor) {
                var destinationFloor = elevator.getDestinationFloor();
                if(destinationFloor !== elevator.nextCleanlyStoppableFloor) {
                    var isApproachingPreviousFloor = Math.sign(elevator.velocityY) === Math.sign(elevator.getYPosOfFloor(elevator.nextCleanlyStoppableFloor) - elevator.y);
                    if(isApproachingPreviousFloor) {
                        var direction = elevator.velocityY > 0.0 ? "down" : "up";
                        elevator.trigger("passing_floor", elevator.nextCleanlyStoppableFloor, direction);
                    }
                    // Destination floor might have changed during the event triggering...
                    if(elevator.getDestinationFloor() !== elevator.nextCleanlyStoppableFloor) {
                        elevator.nextCleanlyStoppableFloor = nextCleanlyStoppableFloor;
                    }
                }
            }
        }
    });

    elevator.destinationY = elevator.getYPosOfFloor(elevator.currentFloor);

    return elevator;
}