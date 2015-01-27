


var createWorldCreator = function() {
    var creator = {};

    creator.createFloors = function(floorCount, floorHeight) {
        var floors = _.map(_.range(floorCount), function(e, i) {
            var yPos = (floorCount - 1 - i) * floorHeight;
            var floor = asFloor({}, i, yPos);
            return floor;
        });
        return floors;
    };
    creator.createElevators = function(elevatorCount, floorCount, floorHeight, elevatorCapacity) {
        var elevators = _.map(_.range(elevatorCount), function(e, i) {
            var elevator = asMovable({});
            elevator = asElevator(elevator, 2.6, floorCount, floorHeight, elevatorCapacity);

            // Move to right x position
            elevator.moveTo((20 + elevator.width) * i + 200, null);
            elevator.setFloorPosition(0);
            elevator.updateDisplayPosition();
            return elevator;
        });
        return elevators;
    };

    creator.createRandomUser = function(floorCount, floorHeight) {
        var user = asMovable({});
        var weight = _.random(55, 100);
        user = asUser(user, weight, floorCount, floorHeight);
        if(_.random(40) === 0) {
            user.displayType = "child";
        } else if(_.random(1) === 0) {
            user.displayType = "female";
        } else {
            user.displayType = "male";
        }
        return user;
    }

    creator.spawnUserRandomly = function(floorCount, floorHeight, floors) {
        var user = creator.createRandomUser(floorCount, floorHeight);
        user.moveTo(100+_.random(40), 0);
        var currentFloor = _.random(1) == 0 ? 0 : _.random(floorCount - 1);
        var destinationFloor;
        if(currentFloor === 0) {
            // Definitely going up
            destinationFloor = _.random(1, floorCount - 1);
        } else {
            // Usually going down, but sometimes not
            if(_.random(10) == 0) {
                destinationFloor = (currentFloor + _.random(1, floorCount - 1)) % floorCount;
            } else {
                destinationFloor = 0;
            }
        }
        user.appearOnFloor(floors[currentFloor], destinationFloor);
        return user;
    }

    creator.createWorld = function(options) {
        console.log("Creating world with options", options);
        var defaultOptions = { floorHeight: 50, floorCount: 4, elevatorCount: 2, spawnRate: 0.5 };
        options = _.defaults(_.clone(options), defaultOptions);
        console.log("Options after default are", options);
        var world = {floorHeight: options.floorHeight, transportedCounter: 0};
        riot.observable(world);
        
        
        world.floors = creator.createFloors(options.floorCount, world.floorHeight);
        world.elevators = creator.createElevators(options.elevatorCount, options.floorCount, world.floorHeight, options.elevatorCapacity);
        world.elevatorInterfaces = _.map(world.elevators, function(e) { return asElevatorInterface({}, e, options.floorCount); });
        world.users = [];
        world.transportedCounter = 0;
        world.transportedPerSec = 0.0;
        world.moveCount = 0;
        world.elapsedTime = 0.0;
        world.maxWaitTime = 0.0;
        world.avgWaitTime = 0.0;
        world.challengeEnded = false;

        var recalculateStats = function() {
            world.transportedPerSec = world.transportedCounter / world.elapsedTime;
            world.moveCount = _.reduce(world.elevators, function(sum, elevator) { return sum+elevator.moveCount; }, 0);
            world.trigger("stats_changed");
        };

        var registerUser = function(user) {
            world.users.push(user);
            user.updateDisplayPosition();
            user.spawnTimestamp = world.elapsedTime;
            world.trigger("new_user", user);
            user.on("exited_elevator", function() {
                world.transportedCounter++;
                world.maxWaitTime = Math.max(world.maxWaitTime, world.elapsedTime - user.spawnTimestamp);
                world.avgWaitTime = (world.avgWaitTime * (world.transportedCounter - 1) + (world.elapsedTime - user.spawnTimestamp)) / world.transportedCounter;
                recalculateStats();
            });
        };

        // Bind them all together
        _.each(world.elevators, function(elevator) {
            elevator.on("entrance_available", function() {
                // Notify floors first because overflowing users
                // will press buttons again
                _.each(world.floors, function(floor, i) {
                    if(elevator.currentFloor == i) {
                        floor.elevatorAvailable(elevator);
                    }
                });

                _.each(world.users, function(user) {
                    if(user.currentFloor === elevator.currentFloor) {
                        user.elevatorAvailable(elevator, world.floors[elevator.currentFloor]);
                    }
                });
            });
        });

        // This will cause elevators to "re-arrive" at floors if someone presses an
        // appropriate button on the floor before the elevator has left.
        _.each(world.floors, function(floor) {
            floor.on("up_button_pressed down_button_pressed", function(eventName) {
                // Need randomize iteration order or we'll tend to fill upp first elevator
                _.each(_.sample(_.range(world.elevators.length), world.elevators.length), function(elevIndex) {
                    var elevator = world.elevators[elevIndex];
                    if(
                        eventName === "up_button_pressed" && elevator.goingUpIndicator ||
                        eventName === "down_button_pressed" && elevator.goingDownIndicator) {

                        // Elevator is heading in correct direction, check for suitability
                        if(elevator.currentFloor === floor.level && elevator.isOnAFloor() && !elevator.isMoving && !elevator.isFull()) {
                            // Potentially suitable to get into
                            // Use the interface queue functionality to queue up this action
                            world.elevatorInterfaces[elevIndex].goToFloor(floor.level, true);
                            return false;
                        }
                    }
                });
            });
        });

        var elapsedSinceSpawn = 1.001/options.spawnRate;
        var elapsedSinceStatsUpdate = 0.0;

        // Main update function
        world.update = function(dt) {
            world.elapsedTime += dt;
            elapsedSinceSpawn += dt;
            elapsedSinceStatsUpdate += dt;
            while(elapsedSinceSpawn > 1.0/options.spawnRate) {
                elapsedSinceSpawn -= 1.0/options.spawnRate;
                registerUser(creator.spawnUserRandomly(options.floorCount, world.floorHeight, world.floors));
            }

            _.each(world.floors, function(f){
                f.maxWaitTime = 0;
            });
            _.each(world.elevators, function(e) { e.update(dt); e.updateElevatorMovement(dt) });
            _.each(world.users, function(u) {
                u.update(dt);
                world.floors[u.currentFloor].maxWaitTime = Math.max(world.floors[u.currentFloor].maxWaitTime, world.elapsedTime - u.spawnTimestamp);
                world.maxWaitTime = Math.max(world.maxWaitTime, world.elapsedTime - u.spawnTimestamp);
            });

            _.remove(world.users, function(u) { return u.removeMe; });
            recalculateStats();
        };

        world.updateDisplayPositions = function() {
            _.each(world.elevators, function(e) { e.updateDisplayPosition(); });
            _.each(world.users, function(u) { u.updateDisplayPosition(); });
        }


        world.unWind = function() {
            console.log("Unwinding", world);
            _.each(world.elevators.concat(world.elevatorInterfaces).concat(world.users).concat(world.floors).concat([world]), function(obj) {
                obj.off("*");
                delete obj; // (Wat)
            });
            world.challengeEnded = true;
            world.elevators = world.elevatorInterfaces = world.users = world.floors = [];
        }

        world.init = function() {
            // Checking the floor queue of the elevators triggers the idle event here
            _.each(world.elevatorInterfaces, function(ei) { ei.checkDestinationQueue(); });
        };

        return world;
    };

    return creator;
};


var createWorldController = function(dtMax) {
    var controller = riot.observable({});
    controller.timeScale = 1.0;
    controller.isPaused = true;
    controller.start = function(world, codeObj, animationFrameRequester, autoStart) {
        controller.isPaused = true;
        controller.challengeEnded = false;
        var lastT = null;
        var firstUpdate = true;
        var updater = function(t) {
            if(!controller.isPaused && !world.challengeEnded && lastT !== null) {
                if(firstUpdate) {
                    firstUpdate = false;
                    // This logic prevents infite loops in usercode from breaking the page permanently - don't evaluate user code until game is unpaused.
                    try {
                        codeObj.init(world.elevatorInterfaces, world.floors);
                        world.init();
                    } catch(e) { controller.setPaused(true); controller.trigger("code_error", e); }
                }

                var dt = (t - lastT);
                var scaledDt = dt * 0.001 * controller.timeScale;
                scaledDt = Math.min(scaledDt, dtMax * 40); // Prevent unhealthy looping
                try {
                    codeObj.update(scaledDt, world.elevatorInterfaces, world.floors);
                } catch(e) { controller.setPaused(true); console.log("Usercode error on update", e); controller.trigger("code_error", e); }
                while(scaledDt > 0.0 && !world.challengeEnded) {
                    var thisDt = Math.min(dtMax, scaledDt);
                    world.update(thisDt);
                    scaledDt -= dtMax;
                }
                world.updateDisplayPositions();
                world.trigger("stats_display_changed"); // TODO: Trigger less often for performance reasons etc
            }
            lastT = t;
            if(!world.challengeEnded) {
                animationFrameRequester(updater);
            }
        };
        if(autoStart) {
            controller.setPaused(false);
        }
        animationFrameRequester(updater);
    };

    controller.setPaused = function(paused) {
        controller.isPaused = paused;
        controller.trigger("timescale_changed");
    };
    controller.setTimeScale = function(timeScale) {
        controller.timeScale = timeScale;
        controller.trigger("timescale_changed");
    }

    return controller;
};

