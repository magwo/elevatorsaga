{
    name: 'AzizHarrington\'s Solution Levels 1-12',
    url: 'https://github.com/AzizHarrington/elevatorsaga/blob/master/solutions.js',
    init: function(elevators, floors) {

        // set to true to optimize algorithm for moves
        var optimizeMoves = false;
        // set to true to optimize algorithm for wait
        var optimizeWait = false;

        // check floors & elevators for events
        map(floors, checkForButtonPress);
        map(elevators, checkFloorButton);
        map(elevators, checkPassingFloor);
        if (!optimizeMoves && !optimizeWait) {
            map(elevators, checkForIdle);
        }

        // button pressed at floor
        function checkForButtonPress(floor) {
            // for now we don't differentiate between up and down passengers
            floor.on("up_button_pressed down_button_pressed", function() {
                assignElevator(floor);
            });
        }

        // button pressed inside elevator
        function checkFloorButton(elevator) {
            elevator.on("floor_button_pressed", function (floorNum) {
                if (elevator.destinationQueue.indexOf(floorNum) === -1) {
                    // go to floor if we're not already headed there
                    elevator.goToFloor(floorNum);
                }
            });
        }

        // if passing floor in destination queue, lets
        // stop there, then be on our way
        function checkPassingFloor(elevator) {
            elevator.on("passing_floor", function (floorNum, direction) {
                var queue = elevator.destinationQueue;
                var index = queue.indexOf(floorNum);
                if (index > -1) {
                    var floor = floors[floorNum];
                    var goingUp = floor.buttonStates.up === 'activated';
                    var goingDown = floor.buttonStates.down === 'activated';
                    var passengerOnFloor = goingUp || goingDown;
                    var floorInRequests = elevator.getPressedFloors().indexOf(floorNum) > -1;
                    // remove the floor as we decide what to do with it
                    queue.splice(index, 1);
                    elevator.checkDestinationQueue();
                    // passenger has requested this floor, so stop
                    if (floorInRequests) {
                        elevator.goToFloor(floorNum, true);
                    } else if (passengerOnFloor) {
                        // passenger is waiting at this floor,
                        // decide to stop or not
                        if (elevator.loadFactor() < .7) {
                            // our elevator is not too crowded, so lets stop
                            elevator.goToFloor(floorNum, true);
                        } else {
                            // too crowded now
                            if (optimizeMoves) {
                                // add it back to our queue for later
                                elevator.goToFloor(floorNum);
                            } else {
                                // give it to another elevator
                                assignElevator(floor);
                            }
                        }
                    }
                    // floor was not in requests, and passenger was
                    // not on floor, so we dont do anything with the
                    // floor number, just leave it removed
                }
            });
        }

        // if idle, send back to ground floor
        function checkForIdle(elevator) {
            elevator.on("idle", function () {
                elevator.goToFloor(0);
            });
        }

        // determine best elevator to send
        // based on suitability score
        function assignElevator(floor) {
            var floorNo = floor.floorNum();
            var elevatorScores = map(elevators, scoreElevators);
            var bestScore = reduce(elevatorScores, findBest, null);
            var elevator = bestScore[0];

            elevator.goToFloor(floorNo);

            function findBest(current, elevatorScore) {
                // lower ranking is better
                if (current === null) {
                    return elevatorScore;
                } else if (elevatorScore[1] < current[1]) {
                    return elevatorScore;
                } else {
                    return current;
                }
            }

            function scoreElevators(elevator) {
                var score;
                var queue = elevator.destinationQueue;
                var distanceFromFloor = getDistance();
                var load = elevator.loadFactor();

                score = distanceFromFloor;
                // apply load factor to score
                if (optimizeMoves) {
                    // if move optimization is enabled,
                    // then we favor fuller elevators
                    score -= (queue.length * (1 + load));
                } else if (optimizeWait) {
                    score += (queue.length * (1 + load));
                } else {
                    // otherwise favor lighter elevators
                    score += (queue.length * (1 + load));
                }

                return [elevator, score];

                function getDistance() {
                    if (queue.length === 0) {
                        // no destinations scheduled
                        // so lets use current floor
                        return Math.abs(elevator.currentFloor() - floorNo);
                    }
                    // search destination queue
                    // for a stop close to floorNo
                    return reduce(queue, function (current, scheduledLocation) {
                        var distance = Math.abs(scheduledLocation - floorNo);
                        if (current === null) {
                            return distance;
                        } else if (distance < current) {
                            return distance;
                        } else {
                            return current;
                        }
                    }, null);
                }
            }
        }

        //functional array helpers

        function map(array, func) {
            var mapped = [];
            array.forEach(function (element) {
                mapped.push(func(element));
            });
            return mapped;
        }

        function reduce(array, combine, start) {
            var current = start;
            map(array, function (element) {
                current = combine(current, element);
            });
            return current;
        }
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}