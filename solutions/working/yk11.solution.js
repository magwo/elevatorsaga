{
        name: 'yk11\'s solution for all levels',
        url: 'https://github.com/magwo/elevatorsaga/wiki/Solution-by-yk11',
        init: function(elevators, floors) {
            var nOfElevators = elevators.length;

            var waitQueue = [];
            var getClosestQueued = function(currentFloorNum) {
                var lowestScore = 100000;
                var closest = -1;
                var closestIndex = -1;

                for (var i = 0; i < waitQueue.length; i++) {
                    var value = waitQueue[i];
                    var score = Math.max(currentFloorNum, value) - Math.min(currentFloorNum, value);
                    if (score < lowestScore) {
                        lowestScore = score;
                        closest = value;
                        closestIndex = i;
                    }
                }

                if (closestIndex != -1) { waitQueue.splice(closestIndex -1, 1); }

                return closest;
            };

            var Elevator = function(elevator, elevatorIndex) {
                var self = this;
                self.elevator = elevator;

                self.goingUp = true;
                self.prevFloor = 0;
                self.isGoingTo = function(floorNum) {
                    return self.elevator.destinationQueue.indexOf(floorNum) != -1;
                };

                self.isFull = function() {
                    return self.elevator.loadFactor() > 0.7;
                }

                self.goToFloorScore = function(goToFloorNum, goToUp) {
                    if (self.isGoingTo(goToFloorNum)) {
                        return 0;
                    }

                    var multiplier = Math.abs(self.prevFloor - goToFloorNum) / 3;

                    if (self.elevator.destinationQueue.length == 0) {
                        return multiplier;
                    }

                    if ((self.goingUp && !goToUp) || (!self.goingUp && goToUp)) {
                        multiplier *= 4;
                    }

                    multiplier += self.elevator.loadFactor() / 4;

                    return multiplier;
                };

                self.floor_button_pressed = function(floorNum) {
                    if (self.elevator.destinationQueue.indexOf(floorNum) == -1) {
                        self.elevator.destinationQueue.push(floorNum);

                        var lower = [];
                        var higher = [];

                        for (var i = 0; i < self.elevator.destinationQueue.length; i++) {
                            var destinationFloorNum = self.elevator.destinationQueue[i];
                            if (destinationFloorNum <= self.prevFloor) {
                                lower.push(destinationFloorNum);
                            } else {
                                higher.push(destinationFloorNum);
                            }
                        }

                        higher = higher.sort();
                        lower = lower.sort().reverse();

                        if (self.goingUp) {
                            self.elevator.destinationQueue = higher.concat(lower);
                        } else {
                            self.elevator.destinationQueue = lower.concat(higher);
                        }

                        elevator.checkDestinationQueue();
                    }
                };

                self.elevator.on("floor_button_pressed", self.floor_button_pressed);
                self.elevator.on("stopped_at_floor", function(floorNum) {
                    if (floorNum > self.prevFloor || floorNum == 0) {
                        self.goingUp = true;
                    } else if(floorNum < self.prevFloor || floorNum == floors.length - 1) {
                        self.goingUp = false;
                    }

                    prevFloor = floorNum;
                });
                self.elevator.on("idle", function() {
                    var next = getClosestQueued(self.prevFloor);
                    if (next != -1) {
                        self.elevator.goToFloor(next);
                    } else {
                        if (elevatorIndex % 4 != 0) {
                            self.elevator.goToFloor(0);
                        } else {
                            self.elevator.goToFloor(Math.floor((floors.length - 1) * (elevatorIndex + 1) / nOfElevators));
                        }
                    }
                });
            };

            var elevatorObjects = [];
            for (var i = 0; i < nOfElevators; i++) {
                var elevatorObject = new Elevator(elevators[i], i);

                elevatorObjects.push(elevatorObject);

                elevatorObject.elevator.goToFloor(0);
                elevatorObject.elevator.checkDestinationQueue();
            }

            var requestElvator = function(floorNum, up) {
                var lowestScore = 100000;
                var lowestIndex = 0;

                for (var i = 0; i < elevatorObjects.length; i++) {
                    if (!elevatorObjects[i].isFull()) {
                        var score = elevatorObjects[i].goToFloorScore(floorNum, up);
                        if (score < lowestScore) {
                            lowestIndex = i;
                            lowestScore = score;
                        }
                    }
                }

                if (!elevatorObjects[lowestIndex].isFull()) {
                    elevatorObjects[lowestIndex].floor_button_pressed(floorNum);
                } else {
                    if (waitQueue.indexOf(floorNum) == -1) {
                        waitQueue.push(floorNum);
                    }
                }
            };

            var Floor = function(floor) {
                var self = this;
                self.floorNum = floor.floorNum();

                floor.on("up_button_pressed", function() {
                    requestElvator(self.floorNum, true);
                });
                floor.on("down_button_pressed", function() {
                    requestElvator(self.floorNum, false);
                });
            };

            var floorObjects = [];
            for(var i = 0; i < floors.length; i++) {
                floorObjects.push(new Floor(floors[i]));
            }


        },
        update: function(dt, elevators, floors) {
            // We normally don't need to do anything here
        }
}