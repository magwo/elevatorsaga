
var asFloor = function(obj, floorLevel, yPosition) {
    obj.level = floorLevel;
    obj.yPosition = yPosition;
    obj.buttonStates = {up: "", down: ""}


    obj.pressUpButton = function() {
        obj.buttonStates.up = "activated";
        // TODO: Emit event?
    }

    obj.pressDownButton = function() {
        obj.buttonStates.down = "activated";
        // TODO: Emit event?
    }

    obj.elevatorAvailable = function(elevator) {
        if(elevator.goingUp()) {
            obj.buttonStates.up = "";
        }
        if(elevator.goingDown()) {
            obj.buttonStates.down = "";
        }
    }

    return obj;
};