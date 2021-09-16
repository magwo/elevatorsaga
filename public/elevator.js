function newElevStateHandler(elevator) { elevator.handleNewState(); }

function Elevator(speedFloorsPerSec, floorCount, floorHeight, maxUsers) {
    newGuard(this, Elevator);
    Movable.call(this);
    var elevator = this;

    elevator.ACCELERATION = floorHeight * 2.1;
    elevator.DECELERATION = floorHeight * 2.6;
    elevator.MAXSPEED = floorHeight * speedFloorsPerSec;
    elevator.floorCount = floorCount;
    elevator.floorHeight = floorHeight;
    elevator.maxUsers = maxUsers || 4;
    elevator.destinationY = 0.0;
    elevator.velocityY = 0.0;
    // isMoving flag is needed when going to same floor again - need to re-raise events
    elevator.isMoving = false;

    elevator.goingDownIndicator = true;
    elevator.goingUpIndicator = true;

    elevator.currentFloor = 0;
    elevator.previousTruncFutureFloorIfStopped = 0;
    elevator.buttonStates = _.map(_.range(floorCount), function(e, i){ return false; });
    elevator.moveCount = 0;
    elevator.removed = false;
    elevator.userSlots = _.map(_.range(elevator.maxUsers), function(user, i) {
        return { pos: [2 + (i * 10), 30], user: null};
    });
    elevator.width = elevator.maxUsers * 10;
    elevator.destinationY = elevator.getYPosOfFloor(elevator.currentFloor);

    elevator.on("new_state", newElevStateHandler);

    elevator.on("change:goingUpIndicator", function(value){
        elevator.trigger("indicatorstate_change", {up: elevator.goingUpIndicator, down: elevator.goingDownIndicator});
    });

    elevator.on("change:goingDownIndicator", function(value){
        elevator.trigger("indicatorstate_change", {up: elevator.goingUpIndicator, down: elevator.goingDownIndicator});
    });
};
Elevator.prototype = Object.create(Movable.prototype);

Elevator.prototype.setFloorPosition = function(floor) {
    var destination = this.getYPosOfFloor(floor);
    this.currentFloor = floor;
    this.previousTruncFutureFloorIfStopped = floor;
    this.moveTo(null, destination);
};

Elevator.prototype.userEntering = function(user) {
    var randomOffset = _.random(this.userSlots.length - 1);
    for(var i=0; i<this.userSlots.length; i++) {
        var slot = this.userSlots[(i + randomOffset) % this.userSlots.length];
        if(slot.user === null) {
            slot.user = user;
            return slot.pos;
        }
    }
    return false;
};

Elevator.prototype.pressFloorButton = function(floorNumber) {
    var prev;
    floorNumber = limitNumber(floorNumber, 0, this.floorCount - 1);
    prev = this.buttonStates[floorNumber];
    this.buttonStates[floorNumber] = true;
    if(!prev) {
        this.trigger("floor_button_pressed", floorNumber);
        this.trigger("floor_buttons_changed", this.buttonStates, floorNumber);
    }
};

Elevator.prototype.userExiting = function(user) {
    for(var i=0; i<this.userSlots.length; i++) {
        var slot = this.userSlots[i];
        if(slot.user === user) {
            slot.user = null;
        }
    }
};

Elevator.prototype.updateElevatorMovement = function(dt) {
    if(this.isBusy()) {
        // TODO: Consider if having a nonzero velocity here should throw error..
        return;
    }

    // Make sure we're not speeding
    this.velocityY = limitNumber(this.velocityY, -this.MAXSPEED, this.MAXSPEED);

    // Move elevator
    this.moveTo(null, this.y + this.velocityY * dt);

    var destinationDiff = this.destinationY - this.y;
    var directionSign = Math.sign(destinationDiff);
    var velocitySign = Math.sign(this.velocityY);
    var acceleration = 0.0;
    if(destinationDiff !== 0.0) {
        if(directionSign === velocitySign) {
            // Moving in correct direction
            var distanceNeededToStop = distanceNeededToAchieveSpeed(this.velocityY, 0.0, this.DECELERATION);
            if(distanceNeededToStop * 1.05 < -Math.abs(destinationDiff)) {
                // Slow down
                // Allow a certain factor of extra breaking, to enable a smooth breaking movement after detecting overshoot
                var requiredDeceleration = accelerationNeededToAchieveChangeDistance(this.velocityY, 0.0, destinationDiff);
                var deceleration = Math.min(this.DECELERATION*1.1, Math.abs(requiredDeceleration));
                this.velocityY -= directionSign * deceleration * dt;
            } else {
                // Speed up (or keep max speed...)
                acceleration = Math.min(Math.abs(destinationDiff*5), this.ACCELERATION);
                this.velocityY += directionSign * acceleration * dt;
            }
        } else if(velocitySign === 0) {
            // Standing still - should accelerate
            acceleration = Math.min(Math.abs(destinationDiff*5), this.ACCELERATION);
            this.velocityY += directionSign * acceleration * dt;
        } else {
            // Moving in wrong direction - decelerate as much as possible
            this.velocityY -= velocitySign * this.DECELERATION * dt;
            // Make sure we don't change direction within this time step - let standstill logic handle it
            if(Math.sign(this.velocityY) !== velocitySign) {
                this.velocityY = 0.0;
            }
        }
    }

    if(this.isMoving && Math.abs(destinationDiff) < 0.5 && Math.abs(this.velocityY) < 3) {
        // Snap to destination and stop
        this.moveTo(null, this.destinationY);
        this.velocityY = 0.0;
        this.isMoving = false;
        this.handleDestinationArrival();
    }
};

Elevator.prototype.handleDestinationArrival = function() {
    this.trigger("stopped", this.getExactCurrentFloor());

    if(this.isOnAFloor()) {
        this.buttonStates[this.currentFloor] = false;
        this.trigger("floor_buttons_changed", this.buttonStates, this.currentFloor);
        this.trigger("stopped_at_floor", this.currentFloor);
        // Need to allow users to get off first, so that new ones
        // can enter on the same floor
        this.trigger("exit_available", this.currentFloor, this);
        this.trigger("entrance_available", this);
    }
};

Elevator.prototype.goToFloor = function(floor) {
    this.makeSureNotBusy();
    this.isMoving = true;
    this.destinationY = this.getYPosOfFloor(floor);
};

Elevator.prototype.getFirstPressedFloor = function() {
    deprecationWarning("getFirstPressedFloor");
    for(var i=0; i<this.buttonStates.length; i++) {
        if(this.buttonStates[i]) { return i; }
    }
    return 0;
};

Elevator.prototype.getPressedFloors = function() {
    for(var i=0, arr=[]; i<this.buttonStates.length; i++) {
        if(this.buttonStates[i]) {
            arr.push(i);
        }
    }
    return arr;
};

Elevator.prototype.isSuitableForTravelBetween = function(fromFloorNum, toFloorNum) {
    if(fromFloorNum > toFloorNum) { return this.goingDownIndicator; }
    if(fromFloorNum < toFloorNum) { return this.goingUpIndicator; }
    return true;
};

Elevator.prototype.getYPosOfFloor = function(floorNum) {
    return (this.floorCount - 1) * this.floorHeight - floorNum * this.floorHeight;
};

Elevator.prototype.getExactFloorOfYPos = function(y) {
    return ((this.floorCount - 1) * this.floorHeight - y) / this.floorHeight;
};

Elevator.prototype.getExactCurrentFloor = function() {
    return this.getExactFloorOfYPos(this.y);
};

Elevator.prototype.getDestinationFloor = function() {
    return this.getExactFloorOfYPos(this.destinationY);
};

Elevator.prototype.getRoundedCurrentFloor = function() {
    return Math.round(this.getExactCurrentFloor());
};

Elevator.prototype.getExactFutureFloorIfStopped = function() {
    var distanceNeededToStop = distanceNeededToAchieveSpeed(this.velocityY, 0.0, this.DECELERATION);
    return this.getExactFloorOfYPos(this.y - Math.sign(this.velocityY) * distanceNeededToStop);
};

Elevator.prototype.isApproachingFloor = function(floorNum) {
    var floorYPos = this.getYPosOfFloor(floorNum);
    var elevToFloor = floorYPos - this.y;
    return this.velocityY !== 0.0 && (Math.sign(this.velocityY) === Math.sign(elevToFloor));
};

Elevator.prototype.isOnAFloor = function() {
    return epsilonEquals(this.getExactCurrentFloor(), this.getRoundedCurrentFloor());
};

Elevator.prototype.getLoadFactor = function() {
    var load = _.reduce(this.userSlots, function(sum, slot) { return sum + (slot.user ? slot.user.weight : 0); }, 0);
    return load / (this.maxUsers * 100);
};

Elevator.prototype.isFull = function() {
    for(var i=0; i<this.userSlots.length; i++) { if(this.userSlots[i].user === null) { return false; } }
    return true;
};
Elevator.prototype.isEmpty = function() {
    for(var i=0; i<this.userSlots.length; i++) { if(this.userSlots[i].user !== null) { return false; } }
    return true;
};

Elevator.prototype.handleNewState = function() {
    // Recalculate the floor number etc
    var currentFloor = this.getRoundedCurrentFloor();
    if(currentFloor !== this.currentFloor) {
        this.moveCount++;
        this.currentFloor = currentFloor;
        this.trigger("new_current_floor", this.currentFloor);
    }

    // Check if we are about to pass a floor
    var futureTruncFloorIfStopped = Math.trunc(this.getExactFutureFloorIfStopped());
    if(futureTruncFloorIfStopped !== this.previousTruncFutureFloorIfStopped) {
        // The following is somewhat ugly.
        // A formally correct solution should iterate and generate events for all passed floors,
        // because the elevator could theoretically have such a velocity that it would
        // pass more than one floor over the course of one state change (update).
        // But I can't currently be arsed to implement it because it's overkill.
        var floorBeingPassed = Math.round(this.getExactFutureFloorIfStopped());

        // Never emit passing_floor event for the destination floor
        // Because if it's the destination we're not going to pass it, at least not intentionally
        if(this.getDestinationFloor() !== floorBeingPassed && this.isApproachingFloor(floorBeingPassed)) {
            var direction = this.velocityY > 0.0 ? "down" : "up";
            this.trigger("passing_floor", floorBeingPassed, direction);
        }
    }
    this.previousTruncFutureFloorIfStopped = futureTruncFloorIfStopped;
};
