

var asFloor = function(obj, floorLevel, yPosition) {
    obj.level = floorLevel;
    obj.yPosition = yPosition;
    obj.buttonStates = {up: false, down: false}


    obj.pressUpButton = function() {
        obj.buttonStates.up = true;
        // TODO: Emit event?
    }

    obj.pressDownButton = function() {
        obj.buttonStates.down = true;
        // TODO: Emit event?
    }

    obj.elevatorAvailable = function(elevator) {
        if(elevator.goingUp()) {
            obj.buttonStates.up = false;
        }
        if(elevator.goingDown()) {
            obj.buttonStates.down = false;
        }
    }

    return obj;
};