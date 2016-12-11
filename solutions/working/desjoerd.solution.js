{
    name: 'DeSjoerd solution (v 0.9)',
    url: 'https://github.com/magwo/elevatorsaga/wiki/Solution-by-DeSjoerd',
    init: function(elevators, floors) {
        var nOfElevators = elevators.length;

        var waitQueue = [];
        var getClosestQueued = function(currentFloorNum) {

            var lowestScore = 100000;
            var closest = -1;
            var closestIndex = -1;
            for(var i = 0; i < waitQueue.length; i++) {
                var value = waitQueue[i];
                var score = Math.max(currentFloorNum, value) - Math.min(currentFloorNum, value);
                if(score < lowestScore) {
                    lowestScore = score;
                    closest = value;
                    closestIndex = i;
                }
            }

            if(closestIndex != -1) {
                waitQueue.splice(closestIndex -1, 1);
            }

            return closest;
        };

        var Elevator = function(elevator, baseFloor) {
            baseFloor = baseFloor || 0;

            var self = this;
            self.elevator = elevator;

            self.goingUp = true;
            self.prevFloor = 0;
            self.isGoingTo = function(floorNum) {
                return self.elevator.destinationQueue.indexOf(floorNum) != -1;
            };

            self.isFull = function() {
                return self.elevator.loadFactor() > 0.3;
            }

            self.goToFloorScore = function(goToFloorNum, goToUp) {
                var multiplier = 4 * self.elevator.loadFactor() + 3;

                if(self.isGoingTo(goToFloorNum) || self.elevator.destinationQueue.length == 0) {
                    return 0;
                }

                if((self.goingUp && goToUp) || (!self.goingUp && !goToUp)) {
                    multiplier =  4 * self.elevator.loadFactor();
                }

                var value = 0;
                if(self.goingUp && goToFloorNum > self.prevFloor) {
                    value += (goToFloorNum * multiplier) - (self.prevFloor * multiplier);
                } else if(!self.goingUp && goToFloorNum < self.prevFloor) {
                    value += (self.prevFloor * multiplier) - (goToFloorNum * multiplier);
                } else {
                    value += floors.length * multiplier * 2;
                }

                return value;
            };

            self.floor_button_pressed = function(floorNum) {
                if(self.elevator.destinationQueue.indexOf(floorNum) == -1) {
                    self.elevator.destinationQueue.push(floorNum);

                    var lower = [];
                    var higher = [];

                    for(var i = 0; i < self.elevator.destinationQueue.length; i++) {
                        var destinationFloorNum = self.elevator.destinationQueue[i];
                        if(destinationFloorNum <= self.prevFloor) {
                            lower.push(destinationFloorNum);
                        } else {
                            higher.push(destinationFloorNum);
                        }
                    }

                    higher = higher.sort();
                    lower = lower.sort().reverse();

                    if(self.goingUp) {
                        self.elevator.destinationQueue = higher.concat(lower);
                    } else {
                        self.elevator.destinationQueue = lower.concat(higher);
                    }

                    if(!self.goingUp) {
                        //self.elevator.destinationQueue = self.elevator.destinationQueue.reverse();
                    }

                    elevator.checkDestinationQueue();
                }
            };

            self.elevator.on("floor_button_pressed", self.floor_button_pressed);
            self.elevator.on("stopped_at_floor", function(floorNum) {
                if(floorNum > self.prevFloor || floorNum == 0) {
                    self.goingUp = true;
                } else if(floorNum < self.prevFloor || floorNum == floors.length -1) {
                    self.goingUp = false;
                }
                prevFloor = floorNum;
            });
            self.elevator.on("idle", function() {
                var next = getClosestQueued(self.prevFloor);
                if(next != -1) {
                    self.elevator.goToFloor(next);
                } else {
                    self.elevator.goToFloor(self.prevFloor);
                }
            });
        };

        var elevatorObjects = [];
        for(var i = 0; i < nOfElevators; i++) {
            var elevatorObject = new Elevator(elevators[i], i);

            elevatorObjects.push(elevatorObject);

            elevatorObject.elevator.goToFloor(0);
            elevatorObject.elevator.checkDestinationQueue();
        }

        var requestElvator = function(floorNum, up) {
            var lowestScore = elevatorObjects[0].goToFloorScore(floorNum, up);
            var lowestIndex = 0;
            for(var i = 1; i < elevatorObjects.length; i++) {
                if(!elevatorObjects[i].isFull()) {
                    var score = elevatorObjects[i].goToFloorScore(floorNum, up);
                    if(score < lowestScore) {
                        lowestIndex = i;
                        lowestScore = score;
                    }
                }
            }
            if(!elevatorObjects[lowestIndex].isFull()) {
                elevatorObjects[lowestIndex].floor_button_pressed(floorNum);
            } else {
                if(waitQueue.indexOf(floorNum) == -1) {
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