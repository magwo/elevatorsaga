{
    name: 'rachkoud',
    url: 'https://github.com/rachkoud',
    init: function(elevators, floors) {
        // Enable the passage of the 'this' object through the JavaScript timers

        var __nativeST__ = window.setTimeout, __nativeSI__ = window.setInterval;

        window.setTimeout = function (vCallback, nDelay /*, argumentToPass1, argumentToPass2, etc. */) {
            var oThis = this, aArgs = Array.prototype.slice.call(arguments, 2);
            return __nativeST__(vCallback instanceof Function ? function () {
                vCallback.apply(oThis, aArgs);
            } : vCallback, nDelay);
        };

        window.setInterval = function (vCallback, nDelay /*, argumentToPass1, argumentToPass2, etc. */) {
            var oThis = this, aArgs = Array.prototype.slice.call(arguments, 2);
            return __nativeSI__(vCallback instanceof Function ? function () {
                vCallback.apply(oThis, aArgs);
            } : vCallback, nDelay);
        };

        console.clear();

        var allFloorRequests = [];

        var Request = function(floor, direction) {
            var self = this;
            self.floor = floor;
            self.direction = direction;
            self.waitingFor = null;

            self.timer = function() {
                if (typeof(app) !== "undefined" && app !== null) {
                    if (!app.world.challengeEnded) {
                        self.waitingFor = self.waitingFor == null ? 0 : self.waitingFor + 1000;
                        setTimeout.call(self, self.timer, 1000);
                    }
                    else {
                        console.log('Floor : ' + self.floor + ' Waiting for : ' + self.waitingFor);
                    }
                } else {
                    setTimeout.call(self, self.timer, 1000);
                }
            }

            self.timer();
        }

        var Floor = function(floor, number) {
            var self = this;
            self.floor = floor;

            self.iNeedAFreeElevator = function() {
                _(allElevators).forEach(function(e) {
                    if (e.elevator.destinationQueue.length == 0) {
                        e.goToFloorAndClearQueue(self.floor.floorNum());
                        return false;
                    }
                });
            }

            floor.on("up_button_pressed", function() {
                // Triggered when someone has pressed the up button at a floor. Note that passengers will press the button again if they fail to enter an elevator.
                allFloorRequests.push(new Request(self.floor.floorNum(), 'up'));

                self.iNeedAFreeElevator();
            });

            floor.on("down_button_pressed", function() {
                // Triggered when someone has pressed the down button at a floor. Note that passengers will press the button again if they fail to enter an elevator.
                allFloorRequests.push(new Request(self.floor.floorNum(), 'down'));

                self.iNeedAFreeElevator();
            });
        }

        var whoIsWaitingForALongTime = function() {
            var maxWaitingFor = null;

            _(allElevators).forEach(function(e) {
                if (e.allElevatorRequests.length > 0) {
                    var max = _.max(e.allElevatorRequests, function(r) { return r.waitingFor; });
                    if (maxWaitingFor == null || max.waitingFor > maxWaitingFor.waitingFor) {
                        maxWaitingFor = max;
                    }
                }
            });

            var max = _.max(allFloorRequests, function(r) { return r.waitingFor; });
            if (maxWaitingFor == null || max.waitingFor > maxWaitingFor.waitingFor) {
                maxWaitingFor = max;
            }

            return maxWaitingFor;
        }

        var Elevator = function(elevator, id) {
            var self = this;
            self.elevator = elevator;
            self.id = id;
            self.allElevatorRequests = [];

            self.goToMaxFloor = function() {
                var maxFloorInAllElevatorRequests = _.max(self.allElevatorRequests, function(r) { return r.floor; }).floor;
                var minFloorInAllElevatorRequests = _.min(self.allElevatorRequests, function(r) { return r.floor; }).floor;

                var floor = null;

                if (maxFloorInAllElevatorRequests > self.elevator.currentFloor()) {
                    floor = maxFloorInAllElevatorRequests;
                } else if (minFloorInAllElevatorRequests < self.elevator.currentFloor()) {
                    floor = minFloorInAllElevatorRequests;
                }

                if (floor != null) {
                    if (self.elevator.destinationQueue.length > 0 && self.elevator.destinationQueue[0] == floor) {
                        // Nothing to do
                    }
                    else {
                        self.goToFloorAndClearQueue(floor);
                    }
                }
            }

            self.goToFloorAndClearQueue = function(floor) {
                  self.elevator.destinationQueue = [];
                  self.elevator.goToFloor(floor);
                  self.elevator.checkDestinationQueue();
            }

            self.freePlaces = function() {
                //return self.elevator.loadFactor() < 0.8;
                return self.elevator.maxPassengerCount() - self.allElevatorRequests.length;;
            }

            self.requestsAtFloor = function(floor, direction) {
                return _.filter(allFloorRequests, function(r) { return r.floor == floor && r.direction == direction; });
            }

            elevator.on("floor_button_pressed", function(floorNum) {
                //debugger;
                self.allElevatorRequests.push(new Request(floorNum));

                self.goToMaxFloor();
            });

            elevator.on("stopped_at_floor", function(floorNum) {
                //debugger;
                _.remove(self.allElevatorRequests, function(r) { return r.floor == floorNum; });
                _.remove(allFloorRequests, function(r) { return r.floor == floorNum; });
                //_.remove(self.elevator.destinationQueue, function(d) { return d == floorNum; });

                if (self.allElevatorRequests.length > 0) {
                    self.goToMaxFloor();
                }
            });

            elevator.on("passing_floor", function(floorNum, direction) {
                //debugger;
                if (self.freePlaces() > 0 && self.requestsAtFloor(floorNum, direction).length > 0) {
                    self.goToFloorAndClearQueue(floorNum);

                    // We must remove floort requests that the elevator can handle, so another elevator can handle additional requests
                    var removed = 0;
                    _.remove(allFloorRequests, function(n) {
                        if (removed <= self.freePlaces() && n.floor == floorNum) {
                            removed++;
                        }
                        return removed <= self.freePlaces() && n.floor == floorNum;
                    });
                // Check if a passenger in the elevator must stop in the next floor
                } else if (_.chain(self.allElevatorRequests).map(function(r) { return r.floor; }).include(floorNum).value()) {
                    self.goToFloorAndClearQueue(floorNum);
                }
            });

            elevator.on("idle", function() {
                //debugger;
                if (allFloorRequests.length > 0) {
                    self.goToFloorAndClearQueue(allFloorRequests[0].floor);
                    allFloorRequests.shift(); // Remove first floor request
                } else if (self.elevator.currentFloor() != 0) {
                    self.goToFloorAndClearQueue(0);
                }
            });
        }

        var allElevators = [];
        for(var i = 0; i < elevators.length; i++) {
            allElevators.push(new Elevator(elevators[i], i));
        }

        var allFloors = [];
        for(var i = 0; i < floors.length; i++) {
            allFloors.push(new Floor(floors[i], i));
        }
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}