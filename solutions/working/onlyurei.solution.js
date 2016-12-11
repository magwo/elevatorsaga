{
    name: 'Cheng\'s Solution with balanced benchmarks for level 17',
    url: 'https://github.com/magwo/elevatorsaga/wiki/Cheng%27s-Solution-%28Balanced-Benchmarks%29',
    init: function (elevators, floors) {

        function queueDestinationForElevator(elevator, floorNum) {
            if (elevator.destinationQueue.length) {
                if (isElevatorGoingUp(elevator)) {
                    if (floorNum < elevator.destinationQueue[0]) {
                        if (elevator.currentFloor() < floorNum) {
                            elevator.destinationQueue.splice(0, 0, floorNum);
                        } else {
                            elevator.destinationQueue.push(floorNum);
                        }
                    } else if (floorNum > elevator.destinationQueue[elevator.destinationQueue.length - 1]) {
                        elevator.destinationQueue.push(floorNum);
                    } else {
                        for (var i = 0; i < (elevator.destinationQueue.length - 1); i++) {
                            if ((floorNum >= elevator.destinationQueue[i]) && (floorNum <= elevator.destinationQueue[i + 1])) {
                                elevator.destinationQueue.splice(i + 1, 0, floorNum);
                                break;
                            }
                        }
                    }
                } else {
                    if (floorNum > elevator.destinationQueue[0]) {
                        if (elevator.currentFloor() > floorNum) {
                            elevator.destinationQueue.splice(0, 0, floorNum);
                        } else {
                            elevator.destinationQueue.push(floorNum);
                        }
                    } else if (floorNum < elevator.destinationQueue[elevator.destinationQueue.length - 1]) {
                        elevator.destinationQueue.push(floorNum);
                    } else {
                        for (var i = 0; i < (elevator.destinationQueue.length - 1); i++) {
                            if ((floorNum <= elevator.destinationQueue[i]) && (floorNum >= elevator.destinationQueue[i + 1])) {
                                elevator.destinationQueue.splice(i + 1, 0, floorNum);
                                break;
                            }
                        }
                    }
                }
                elevator.checkDestinationQueue();
            } else {
                elevator.goToFloor(floorNum);
            }
        }

        function isElevatorGoingUp(elevator) {
            return !elevator.destinationQueue.length || (elevator.currentFloor() < elevator.destinationQueue[0]);
        }

        function isElevatorGoingDown(elevator) {
            return !elevator.destinationQueue.length || (elevator.currentFloor() > elevator.destinationQueue[0]);
        }

        function isFloorPickupableForElevator(elevator, floorNum) {
            return !elevator.destinationQueue.length
                || (isElevatorGoingUp(elevator) && (elevator.currentFloor() < floorNum))
                || (isElevatorGoingDown(elevator) && (elevator.currentFloor() > floorNum));
        }

        function scheduleElevatorForFloorButtonEvent(floor, isGoingUp) {
            var candidate = null;
            elevators.forEach(function (elevator) {
                if ((elevator.loadFactor() < 1) || (elevator.destinationQueue[0] == floor.floorNum())) {
                    if (candidate) {
                        candidate.floorDiff = Math.abs(candidate.currentFloor() - floor.floorNum());
                        elevator.floorDiff = Math.abs(elevator.currentFloor() - floor.floorNum());
                        if (!elevator.destinationQueue.length) {
                            if (!candidate.destinationQueue.length) {
                                if ((elevator.floorDiff < candidate.floorDiff) || ((elevator.floorDiff == candidate.floorDiff) && (elevator.loadFactor() < candidate.loadFactor()))) {
                                    candidate = elevator;
                                }
                            } else {
                                candidate = elevator;
                            }
                        } else {
                            if ((elevator.floorDiff < candidate.floorDiff) && (elevator.loadFactor() < candidate.loadFactor()) && ((isElevatorGoingUp(elevator) == isGoingUp) || (isElevatorGoingDown(elevator) != isGoingUp)) && isFloorPickupableForElevator(elevator, floor.floorNum())) {
                                candidate = elevator;
                            }
                        }
                    } else {
                        candidate = elevator;
                    }
                }
            });
            if (candidate) {
                queueDestinationForElevator(candidate, floor.floorNum());
            } else {
                elevators.sort(function (a, b) {
                    return (a.floorDiff < b.floorDiff) && (a.loadFactor() < b.loadFactor());
                });
                queueDestinationForElevator(elevators[0], floor.floorNum());
            }
        }

        elevators.forEach(function (elevator) {
            elevator.on('floor_button_pressed', function (floorNum) {
                queueDestinationForElevator(elevator, floorNum);
            });

            elevator.on('stopped_at_floor', function (floorNum) {
                elevator.destinationQueue.forEach(function (destination, index) {
                    if (destination == floorNum) {
                        elevator.destinationQueue.splice(index, 1);
                    }
                });

            });
        });

        floors.forEach(function (floor) {
            floor.on('up_button_pressed', function () {
                scheduleElevatorForFloorButtonEvent(floor, true);
            });
            floor.on('down_button_pressed', function () {
                scheduleElevatorForFloorButtonEvent(floor, false);
            });
        });
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}