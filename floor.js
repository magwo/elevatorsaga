
var asFloor = function(obj, floorLevel, yPosition) {
    var floor = riot.observable(obj);

    floor.level = floorLevel;
    floor.yPosition = yPosition;
    floor.buttonStates = {up: "", down: ""}

    floor.pressUpButton = function() {
        var prev = floor.buttonStates.up;
        floor.buttonStates.up = "activated";
        floor.trigger("buttonstate_change", floor.buttonStates);
        if(prev !== floor.buttonStates.up) { floor.trigger("up_button_pressed"); }
    }

    floor.pressDownButton = function() {
        var prev = floor.buttonStates.down;
        floor.buttonStates.down = "activated";
        floor.trigger("buttonstate_change", floor.buttonStates);
        if(prev !== floor.buttonStates.down) { floor.trigger("down_button_pressed"); }
    }

    floor.elevatorAvailable = function(elevator) {
        if(elevator.goingUpIndicator) {
            floor.buttonStates.up = "";
            floor.trigger("buttonstate_change", floor.buttonStates);
        }
        if(elevator.goingDownIndicator) {
            floor.buttonStates.down = "";
            floor.trigger("buttonstate_change", floor.buttonStates);
        }
    }

    floor.floorNum = function() {
        return floor.level;
    }

    return floor;
};