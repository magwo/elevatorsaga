

var asElevator = function(movable, speedFloorsPerSec, floorCount, floorHeight) {
    movable.currentFloor = 0;
    movable.destinationFloor = 0;
    movable.buttonStates = _.map(_.range(floorCount), function(e, i){ return false; });
    movable.inTransit = false;
    movable.removed = false;
    movable.userSlots = [
        {pos: [2, 30], user: null},
        {pos: [12, 30], user: null},
        {pos: [22, 30], user: null},
        {pos: [32, 30], user: null}];


    movable.setFloorPosition = function(floor) {
        var destination = (floorCount - 1) * floorHeight - floor * floorHeight;
        movable.currentFloor = floor;
        movable.destinationFloor = floor;
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
        movable.buttonStates[floorNumber] = true;

        if(!movable.busy) {
            //movable.goToFloor(floorNumber);
        }
        // TODO: Emit event?
    }

    movable.userExiting = function(user) {
        _.each(movable.userSlots, function(slot) {
            if(slot.user === user) {
                slot.user = null;
            }
        });
    }

    movable.goToFloor = function(floor, cb) {
        movable.makeSureNotBusy();
        movable.destinationFloor = floor;
        var distance = Math.abs(movable.destinationFloor - movable.currentFloor);
        var timeToTravel = 1000.0 * distance / speedFloorsPerSec;
        var destination = (floorCount - 1) * floorHeight - floor * floorHeight;

        movable.moveToOverTime(null, destination, timeToTravel, undefined, function() {
            movable.currentFloor = movable.destinationFloor;
            movable.buttonStates[movable.currentFloor] = false;
            movable.trigger("new_current_floor", movable.currentFloor);
            movable.trigger("stopped_at_floor", movable.currentFloor);
            // Need to allow users to get off first, so that new ones
            // can enter on the same floor
            movable.trigger("exit_available", movable.currentFloor);
            movable.trigger("entrance_available", movable);
            movable.inTransit = false;
            if(cb) { cb(); }
        });
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

    movable.on("new_state", function() {
        // Recalculate the floor number
        var currentFloor = Math.round(((floorCount - 1) * floorHeight - movable.y) / floorHeight);
        if(currentFloor != movable.currentFloor) {
            movable.currentFloor = currentFloor;
            movable.trigger("new_current_floor", movable.currentFloor);
        }
    });

    return movable;
}