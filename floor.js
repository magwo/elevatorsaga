
var asFloor = function(obj, floorLevel, yPosition) {
    riot.observable(obj);

    obj.level = floorLevel;
    obj.yPosition = yPosition;
    obj.buttonStates = {up: "", down: ""}

    obj.pressUpButton = function() {
        obj.buttonStates.up = "activated";
        obj.trigger("buttonstate_change", obj.buttonStates);
    }

    obj.pressDownButton = function() {
        obj.buttonStates.down = "activated";
        obj.trigger("buttonstate_change", obj.buttonStates);
    }

    obj.elevatorAvailable = function(elevator) {
        if(elevator.goingUp()) {
            obj.buttonStates.up = "";
            obj.trigger("buttonstate_change", obj.buttonStates);
        }
        if(elevator.goingDown()) {
            obj.buttonStates.down = "";
            obj.trigger("buttonstate_change", obj.buttonStates);
        }
    }

    return obj;
};