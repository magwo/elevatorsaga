
var asFloor = function(obj, floorLevel, yPosition) {
    riot.observable(obj);

    obj.level = floorLevel;
    obj.yPosition = yPosition;
    obj.buttonStates = {up: "", down: ""}

    obj.pressUpButton = function() {
        var prev = obj.buttonStates.up;
        obj.buttonStates.up = "activated";
        obj.trigger("buttonstate_change", obj.buttonStates);
        if(prev !== obj.buttonStates.up) { obj.trigger("up_button_pressed"); }
    }

    obj.pressDownButton = function() {
        var prev = obj.buttonStates.down;
        obj.buttonStates.down = "activated";
        obj.trigger("buttonstate_change", obj.buttonStates);
        if(prev !== obj.buttonStates.down) { obj.trigger("down_button_pressed"); }
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