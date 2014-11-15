

var asElevator = function(movable, speedFloorsPerSec, floorCount, floorHeight) {

    var ACCELERATION = floorHeight * 2.1;
    var DECELERATION = floorHeight * 2.6;
    var MAXSPEED = floorHeight * speedFloorsPerSec;

    movable.destinationY = 0.0;
    movable.velocityY = 0.0;
    // isMoving flag is needed when going to same floor again - need to re-raise events
    movable.isMoving = false;

    movable.currentFloor = 0;
    movable.nextCleanlyStoppableFloor = 0;
    movable.buttonStates = _.map(_.range(floorCount), function(e, i){ return false; });
    movable.moveCount = 0;
    movable.removed = false;
    movable.userSlots = [
        {pos: [2, 30], user: null},
        {pos: [12, 30], user: null},
        {pos: [22, 30], user: null},
        {pos: [32, 30], user: null}];


    movable.setFloorPosition = function(floor) {
        var destination = (floorCount - 1) * floorHeight - floor * floorHeight;
        movable.currentFloor = floor;
        movable.moveTo(null, destination);
    }

    movable.userEntering = function(user) {
        for(var i=0; i<movable.userSlots.length; i++) {
            var slot = movable.userSlots[i];
            if(slot.user === null) {
                slot.user = user;
                return slot.pos;
            }
        }
        return false;
    }

    movable.pressFloorButton = function(floorNumber) {
        floorNumber = limitNumber(floorNumber, 0, floorCount - 1);
        movable.buttonStates[floorNumber] = true;
        movable.trigger("floor_button_pressed", floorNumber);
        movable.trigger("floor_buttons_changed", movable.buttonStates);
    }

    movable.userExiting = function(user) {
        _.each(movable.userSlots, function(slot) {
            if(slot.user === user) {
                slot.user = null;
            }
        });
    }

    movable.updateElevatorMovement = function(dt) {
        if(movable.isBusy()) {
            // TODO: Consider if having a nonzero velocity here should throw error..
            return;
        }

        // Make sure we're not speeding
        movable.velocityY = limitNumber(movable.velocityY, -MAXSPEED, MAXSPEED);

        // Move elevator
        movable.moveTo(null, movable.y + movable.velocityY * dt);

        var destinationDiff = movable.destinationY - movable.y;
        var directionSign = Math.sign(destinationDiff);
        var velocitySign = Math.sign(movable.velocityY);
        if(destinationDiff !== 0.0) {
            if(directionSign === velocitySign) {
                // Moving in correct direction
                var distanceNeededToStop = distanceNeededToAchieveSpeed(movable.velocityY, 0.0, DECELERATION);
                if(distanceNeededToStop * 1.05 < -Math.abs(destinationDiff)) {
                    // Slow down
                    // Allow a certain factor of extra breaking, to enable a smooth breaking movement after detecting overshoot
                    var requiredDeceleration = accelerationNeededToAchieveChangeDistance(movable.velocityY, 0.0, destinationDiff);
                    var deceleration = Math.min(DECELERATION*1.1, Math.abs(requiredDeceleration));
                    movable.velocityY -= directionSign * deceleration * dt;
                } else {
                    // Speed up (or keep max speed...)
                    var acceleration = Math.min(Math.abs(destinationDiff*5), ACCELERATION);
                    movable.velocityY += directionSign * acceleration * dt;
                }
            } else if(velocitySign === 0) {
                // Standing still - should accelerate
                var acceleration = Math.min(Math.abs(destinationDiff*5), ACCELERATION);
                movable.velocityY += directionSign * acceleration * dt;
            } else {
                // Moving in wrong direction - decelerate as much as possible
                movable.velocityY -= velocitySign * DECELERATION * dt;
                // Make sure we don't change direction within this time step - let standstill logic handle it
                if(Math.sign(movable.velocityY) !== velocitySign) {
                    movable.velocityY = 0.0;
                }
            }
        }

        if(movable.isMoving && Math.abs(destinationDiff) < 0.5 && Math.abs(movable.velocityY) < 3) {
            movable.moveTo(null, movable.destinationY);
            movable.velocityY = 0.0;
            movable.isMoving = false;
            movable.handleDestinationArrival();
        }
    }

    movable.handleDestinationArrival = function() {
        movable.trigger("stopped", movable.getExactCurrentFloor());

        if(movable.isOnAFloor()) {
            movable.buttonStates[movable.currentFloor] = false;
            movable.trigger("floor_buttons_changed", movable.buttonStates);
            movable.trigger("stopped_at_floor", movable.currentFloor);
            // Need to allow users to get off first, so that new ones
            // can enter on the same floor
            movable.trigger("exit_available", movable.currentFloor);
            movable.trigger("entrance_available", movable);
        }
    }

    movable.goToFloor = function(floor) {
        movable.makeSureNotBusy();
        movable.isMoving = true;
        movable.destinationY = movable.getYPosOfFloor(floor);
    }

    movable.getFirstPressedFloor = function() {
        for(var i=0; i<movable.buttonStates.length; i++) {
            if(movable.buttonStates[i]) { return i; }
        }
        return 0;
    }


    movable.goingUp = function() {
        return true; // TODO: Make usercode returnable
    }

    movable.goingDown = function() {
        return true; // TODO: Make usercode returnable
    }

    movable.getYPosOfFloor = function(floorNum) {
        return (floorCount - 1) * floorHeight - floorNum * floorHeight;
    }

    movable.getExactFloorOfDestinationY = function(y) {
        return ((floorCount - 1) * floorHeight - y) / floorHeight;
    }

    movable.getExactCurrentFloor = function() {
        return movable.getExactFloorOfDestinationY(movable.y);
    }

    movable.getRoundedCurrentFloor = function() {
        var foo = Math.round(movable.getExactCurrentFloor());
        if(foo == NaN) throw "FOO";
        return foo;
    }

    movable.getExactFutureFloorIfStopped = function() {
        var distanceNeededToStop = distanceNeededToAchieveSpeed(movable.velocityY, 0.0, DECELERATION);
        return movable.getExactFloorOfDestinationY(movable.y - Math.sign(movable.velocityY) * distanceNeededToStop);
    }

    movable.isOnAFloor = function() {
        return epsilonEquals(movable.getExactCurrentFloor(), movable.getRoundedCurrentFloor());
    }

    movable.getLoadFactor = function() {
        var load = _.reduce(movable.userSlots, function(sum, slot) { return sum + (slot.user ? slot.user.weight : 0); }, 0);
        console.log(load);
        return load / 400.0;
    }


    movable.on("new_state", function() {
        // Recalculate the floor number etc
        var currentFloor = movable.getRoundedCurrentFloor();
        if(currentFloor != movable.currentFloor) {
            movable.moveCount++;
            movable.currentFloor = currentFloor;
            movable.trigger("new_current_floor", movable.currentFloor);
        }

        // Check if we are about to pass a floor
        // TODO: Try to make this code simpler
        // TODO: Write tests for this code, covering any edge cases
        if(movable.velocityY !== 0.0) {
            var nextCleanlyStoppableFloor = movable.getExactFutureFloorIfStopped();
            nextCleanlyStoppableFloor = (movable.velocityY > 0.0 ? Math.floor : Math.ceil)(nextCleanlyStoppableFloor);

            if(movable.nextCleanlyStoppableFloor !== nextCleanlyStoppableFloor) {
                var destinationFloor = movable.getExactFloorOfDestinationY(movable.destinationY);
                if(destinationFloor !== movable.nextCleanlyStoppableFloor) {
                    var isApproachingPreviousFloor = Math.sign(movable.velocityY) === Math.sign(movable.getYPosOfFloor(movable.nextCleanlyStoppableFloor) - movable.y);
                    if(isApproachingPreviousFloor) {
                        var direction = movable.velocityY > 0.0 ? "down" : "up";
                        movable.trigger("passing_floor", movable.nextCleanlyStoppableFloor, direction);
                    }
                    movable.nextCleanlyStoppableFloor = nextCleanlyStoppableFloor;
                }
            }
        }
    });

    movable.destinationY = movable.getYPosOfFloor(movable.currentFloor);

    return movable;
}