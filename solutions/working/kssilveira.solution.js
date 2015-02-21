{
    name: 'Kaue\'s Solution for level 17; each elevator is fair (ie no starvation); using direction lights; load balancing using the modulo operator (it is more effective than \'least loaded\'); local scheduling.',
    url: 'https://github.com/magwo/elevatorsaga/wiki/Kaue\'s-Solution',
    init: function(elevators, floors) {
        var floorTotal = floors.length;
        var elevatorTotal = elevators.length;
        var goingUp = []; // elevator -> boolean
        var isDestination = [];  // elevator -> floor -> direction (up = true) -> boolean

        for (var i = 0; i < elevatorTotal; i++) {
            goingUp[i] = true;
            isDestination[i] = [];
            for (var j = 0; j < floorTotal; j++) {
                isDestination[i][j] = [];
                isDestination[i][j][false] = false;
                isDestination[i][j][true] = false;
            }
        }

        for (var i = 0; i < elevatorTotal; i++) {
            var closure = function(elevator, index) {
                return function(floorNum) {
                    isDestination[index][floorNum][floorNum > elevator.currentFloor()] = true;
                }
            }
            var elevator = elevators[i];
            elevator.on("floor_button_pressed", closure(elevator, i));
        }

        for (var i = 0; i < floorTotal; i++) {
            var closure = function(floor, name, goingUp) {
                return function() {
                    var floorNum = floor.floorNum();
                    isDestination[floorNum % elevatorTotal][floorNum][goingUp] = true;

                    // least loaded is less efficient
                    // var minLoadIndex = 0;
                    // for (var j = 1; j < elevatorTotal; j++) {
                    //      if (elevators[j].loadFactor() < elevators[minLoadIndex].loadFactor() ||
                    //         (elevators[j].loadFactor() == elevators[minLoadIndex].loadFactor() &&
                    //          Math.abs(elevators[j].currentFloor() - floorNum) < Math.abs(elevators[minLoadIndex].currentFloor() - floorNum))) {
                    //         minLoadIndex = j;
                    //     }
                    // }
                    // isDestination[minLoadIndex][floorNum][goingUp] = true;
                }
            }
            floors[i].on("up_button_pressed", closure(floors[i], 'up_button_pressed', true));
            floors[i].on("down_button_pressed", closure(floors[i], 'down_button_pressed', false));
        }

        for (var i = 0; i < elevatorTotal; i++) {
            var closure = function(elevator, index) {
                return function() {
                    var current = elevator.currentFloor();
                    var done = false;
                    var next = -1;
                    isDestination[index][current][goingUp[index]] = false;
                    for (var iteration = 0; iteration < 3 && !done; iteration++) {
                        if (goingUp[index]) {
                            for (next = current + 1; next < floorTotal && !done; next++) {
                                if (isDestination[index][next][goingUp[index]]) {
                                    done = true;
                                    break;
                                }
                            }
                            if (!done) {
                                goingUp[index] = false;
                                current = floorTotal;
                            }
                        } else {
                            for (next = current - 1; next >=0 && !done; next--) {
                                if (isDestination[index][next][goingUp[index]]) {
                                    done = true;
                                    break;
                                }
                            }
                            if (!done) {
                                goingUp[index] = true;
                                current = -1;
                            }
                        }
                    }

                    if (next == -1 || next == floorTotal) {
                        next = index % floorTotal;
                    }

                    elevator.goingUpIndicator(goingUp[index]);
                    elevator.goingDownIndicator(!goingUp[index]);
                    if (elevator.currentFloor() == floorTotal - 1 || next == floorTotal -1) {
                        elevator.goingDownIndicator(true);
                    }
                    if(elevator.currentFloor() == 0 || next == 0) {
                        elevator.goingUpIndicator(true);
                    }

                    if (next != -1) {
                        elevator.goToFloor(next);
                    }
                }
            }
            var elevator = elevators[i];
            elevator.on("idle", closure(elevator, i));
        }
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}