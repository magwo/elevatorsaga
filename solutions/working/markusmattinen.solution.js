{
    // by Markus Mattinen
    //
    // This solution should complete challenges 1-16 most of the time. Sometimes it gets unlucky on the very last challenges, just try again if that happens.
    // Some configuration is required for some levels, see the first couple of lines of the code.
    //
    // The idea is to use empty elevators to pick up people in the order that the buttons at the floors are pressed to be as fair as possible.
    // Of course multiple elevators are never sent to a floor at the same time to pick up the same people.
    //
    // After picking people up, they are taken to their destination floors in the order that they were picked up in, or in case multiple people were picked up at once,
    // the closest ones will be taken first.
    //
    // This solution also includes code for counting how many people are in each elevator at each time.
    // This is done by counting the number of times the buttons in the elevator are pressed
    // (every person presses it again even if the previous person already pressed the same button)
    // and when the elevator stops, we subtract the number of people who had pressed the button for that
    // floor from the number of people in the elevator.
    //
    // Unfortunately it appears to be impossible to count how many people are waiting on each floor.

    name: 'MarkusMattinen\'s solution (includes benchmarks for all challenges)',
    url: 'https://github.com/MarkusMattinen/elevatorsaga-solutions',
    init: function(elevators, floors) {
        // Automatically determine which algorithm to use from the challenge number.
        var throughputChallenges = [ 1, 2, 3, 4, 5 ];
        var saveMovesChallenges = [ 6, 7 ];

        var path = document.URL.substr(document.URL.lastIndexOf("#"));
        var params = _.reduce(path.split(","), function(result, part) {
            var match = part.match(/(\w+)=(\w+$)/);

            if (match) {
                result[match[1]] = match[2];
            }

            return result;
        }, {});
        var challenge = ~~params.challenge;
        var improveThroughput = throughputChallenges.indexOf(challenge) != -1;
        var saveMoves = saveMovesChallenges.indexOf(challenge) != -1;

        // Queue for floors to pick up people at, in the order the buttons were first pressed
        floors.waitQueue = [];
        // this function adds a floor to the pick-up wait queue if the floor is not already there
        floors.addToWaitQueue = function(floorNum) {
            if (floors.waitQueue.indexOf(floorNum) === -1) {
                floors.waitQueue.push(floorNum);
            }
        };
        floors.removeFromWaitQueue = function(floorNum) {
            var index = floors.waitQueue.indexOf(floorNum);

            if (index !== -1) {
                floors.waitQueue.splice(index, 1);
            }
        };
        
        // This function is called whenever something happens, in case some elevator previously had
        // nothing to do but now there is a person to pick up on another floor.
        var checkElevators = function() {
            elevators.forEach(function(elevator, elevatorNum) {
                elevator.checkIdle();
            });
        };

        // Configure floor events
        floors.forEach(function(floor) {
            // Are there people waiting at this floor
            floor.peopleWaiting = false;
            // Which elevators are currently going to this floor (used to prevent multiple elevators picking up the same person)
            floor.elevatorsGoing = Array.apply(null, new Array(elevators.length)).map(Number.prototype.valueOf,0);
            floor.countCapacityOfElevatorsGoing = function() {
                return this.elevatorsGoing.reduce(function(capacitySum, going, elevatorNum) {
                    if (going) {
                        return capacitySum + elevators[elevatorNum].capacity() + elevators[elevatorNum].peopleGoingTo[floor.floorNum()];
                    } else {
                        return capacitySum;
                    }
                }, 0);
            };

            // Add people to the wait queue in the order that they press the button.
            floor.on("up_button_pressed down_button_pressed", function() {
                floor.peopleWaiting = true;
                floors.addToWaitQueue(floor.floorNum());
                checkElevators();
            });
        });

        // Configure elevator events
        elevators.forEach(function(elevator, elevatorNum) {
            elevator.elevatorNum = elevatorNum;
            // Number of people in this elevator going to each floor
            // Calculated from the number of times each floor's button has been pressed
            elevator.peopleGoingTo = Array.apply(null, new Array(floors.length)).map(Number.prototype.valueOf,0);
            // Queue for the order people have entered the elevator, so we can take
            // them to their destinations as fairly as possible
            elevator.peopleQueue = [[]];

            // The destination queue is not really used in this solution, we just go from
            // idle straight to whichever floor we want to go to and then back to idle.
            elevator.goToFloorAndClearQueue = function(floor) {
                this.destinationQueue = [ floor.floorNum() ];
                this.checkDestinationQueue();
                this.idle = false;

                // Assume that this elevator will only stop at the final destination.
                floors.forEach(function(floor) {
                    floor.elevatorsGoing[this.elevatorNum] = false;
                });

                // Make sure others don't go to the same floor at the same time.
                floor.elevatorsGoing[this.elevatorNum] = true;
            };

            // This is used for solving the levels where we need to use as little moves as possible.
            // So we only move one floor at a time.
            elevator.goTowardsFloor = function(floor) {
                var floorDelta = 1;

                if (floor.floorNum() < this.currentFloor()) {
                    floorDelta = -1;
                }

                var destinationFloorNum = this.currentFloor() + floorDelta;

                this.goToFloorAndClearQueue(floors[destinationFloorNum]);
            };

            // Check the configuration.
            elevator.goToFloorOrTowards = function(floor) {
                if (floor.floorNum() === elevator.currentFloor()) {
                    return;
                }
                
                if (saveMoves) {
                    this.goTowardsFloor(floor);
                } else {
                    this.goToFloorAndClearQueue(floor);
                }
            };

            // Calculate how many people are currently in this elevator.
            elevator.peopleIn = function() {
                return elevator.peopleGoingTo.reduce(function(sum, current) {
                    return sum + current;
                }, 0);
            };

            // How many people can still fit in the elevator.
            elevator.capacity = function() {
                return 4 - this.peopleIn();
            };

            // If we're idle, try to pick up some people or drop someone off.
            elevator.checkIdle = function() {
                if (!this.idle) {
                    return;
                }

                // Try to work around the fact that sometimes people get in the elevator and only press the button once it has
                // started moving by using the load factor. If the load factor tells us that there is someone in but they haven't pressed
                // a button yet, wait for them to press it before we start moving.
                if (this.peopleIn() === 0 && this.loadFactor() > 0) {
                    return;
                }

                // Only pick up people if we have room.
                if (this.peopleIn() === 0 && !saveMoves) {
                    for (var i = 0; i < floors.waitQueue.length; ++i) {
                        // Pick up in the order that the buttons were first pressed on each floor.
                        var floor = floors[floors.waitQueue[i]];
                        
                        if (floor.countCapacityOfElevatorsGoing() === 0) {
                            this.goToFloorOrTowards(floor);
                            return;
                        }
                    }
                }

                // If we're trying to use as little moves as possible, only move when the elevator is full.
                var minimumPeopleInElevator = saveMoves ? 4 : 0;
                var thisElevator = this;

                // In maximum fairness mode, always drop off the person who entered first, or is closest in case many entered at the same time
                if (!improveThroughput) {
                    var closestFloor = { floorNum: this.currentFloor(), delta: 999 };

                    // Take the people who have been in the elevator the longest to their destination first.
                    var queue = this.peopleQueue[0];

                    // If there is nobody in the elevator, do nothing.
                    if (queue.length === 0) {
                        return;
                    }

                    // If many people entered the elevator at the same time, drop off the one whose destination floor is
                    // closest to the elevator's current position first.
                    queue.forEach(function(floorNum) {
                        var delta = Math.abs(floorNum - thisElevator.currentFloor());

                        if (delta < closestFloor.delta && thisElevator.peopleIn() >= minimumPeopleInElevator) {
                            closestFloor = { floorNum: floorNum, delta: delta };
                        }
                    });

                    this.goToFloorOrTowards(floors[closestFloor.floorNum], true);
                } else {
                    // In throughput mode, drop off as many people as possible, on whichever floor is closest out of the floors that the same number of people want to go to
                    var bestFloor = { floorNum: this.currentFloor(), count: 0, delta: 999 };
                    thisElevator.peopleGoingTo.forEach(function(count, floorNum) {
                        var delta = Math.abs(floorNum - thisElevator.currentFloor());

                        if ((count > bestFloor.count || (count === bestFloor.count && delta < bestFloor.delta)) && thisElevator.peopleIn() >= minimumPeopleInElevator) {
                            bestFloor = { floorNum: floorNum, count: count };
                        }
                    });

                    this.goToFloorOrTowards(floors[bestFloor.floorNum], true);
                }
            };

            // We just stopped, so check for people to pick up or drop off.
            // Since we don't use the command queue, this happens quite often.
            elevator.on("idle", function() {
                elevator.idle = true;
                elevator.checkIdle();
            });
            
            // People will be taken to their destinations in the order that they enter the elevator
            // (except when multiple people enter on the same floor)
            elevator.on("floor_button_pressed", function(floorNum) {
                var currentQueue = elevator.peopleQueue[elevator.peopleQueue.length - 1];

                if (currentQueue.indexOf(floorNum) === -1) {
                    currentQueue.push(floorNum);
                }

                elevator.peopleGoingTo[floorNum] += 1;
                elevator.checkIdle();
            });
            
            elevator.on("stopped_at_floor", function(floorNum) {
                // Everyone in this elevator coming to this floor will have left the elevator now
                // so clean up the destination queue of the people in this elevator
                elevator.peopleQueue = elevator.peopleQueue.map(function(queue) {
                    var index = queue.indexOf(floorNum);

                    if (index !== -1) {
                        queue.splice(index, 1);
                    }

                    return queue;
                });

                // Remove empty queue elements
                elevator.peopleQueue = elevator.peopleQueue.filter(function(queue) {
                    return queue.length !== 0;
                });

                // When we next arrive at a floor, group the arrivals together so that
                // they can be assumed to have entered the elevator at the same time
                elevator.peopleQueue.push([]);

                // Assume that everyone was able to fit in the elevator
                // (if not, they will press the button again and end up in the end of the queue)
                floors.removeFromWaitQueue(floorNum);
                floors[floorNum].peopleWaiting = false;
                // allow other elevators to come to this floor if there are more people to pick up
                floors[floorNum].elevatorsGoing[elevatorNum] = false;
                elevator.peopleGoingTo[floorNum] = 0;
            });
        });
    },
    update: function(dt, elevators, floors) {
        elevators.forEach(function(elevator, elevatorNum) {
            if (elevator.idle) {
                elevator.goToFloor(elevator.currentFloor(), true); // pick up anyone waiting
            }
        });
    }
}