
var asFloor = function(obj, floorLevel, yPosition, errorHandler) {
    var floor = riot.observable(obj);

    floor.level = floorLevel;
    floor.yPosition = yPosition;
    floor.buttonStates = {up: "", down: ""};

    // TODO: Ideally the floor should have a facade where tryTrigger is done
    var tryTrigger = function(event, arg1, arg2, arg3, arg4) {
        try {
            floor.trigger(event, arg1, arg2, arg3, arg4);
        } catch(e) { errorHandler(e); }
    };

    floor.pressUpButton = function() {
        var prev = floor.buttonStates.up;
        floor.buttonStates.up = "activated";
        if(prev !== floor.buttonStates.up) {
            tryTrigger("buttonstate_change", floor.buttonStates);
            tryTrigger("up_button_pressed", floor);
        }
    };

    floor.pressDownButton = function() {
        var prev = floor.buttonStates.down;
        floor.buttonStates.down = "activated";
        if(prev !== floor.buttonStates.down) {
            tryTrigger("buttonstate_change", floor.buttonStates);
            tryTrigger("down_button_pressed", floor);
        }
    };

    floor.elevatorAvailable = function(elevator) {
        if(elevator.goingUpIndicator && floor.buttonStates.up) {
            floor.buttonStates.up = "";
            tryTrigger("buttonstate_change", floor.buttonStates);
        }
        if(elevator.goingDownIndicator && floor.buttonStates.down) {
            floor.buttonStates.down = "";
            tryTrigger("buttonstate_change", floor.buttonStates);
        }
    };

    floor.getSpawnPosY = function() {
        return floor.yPosition + 30;
    };

    floor.floorNum = function() {
        return floor.level;
    };

    return floor;
};
