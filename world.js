


var createWorldCreator = function() {
    var creator = {};

    creator.createFloors = function(floorCount, floorHeight, errorHandler) {
        var floors = _.map(_.range(floorCount), function(e, i) {
            var yPos = (floorCount - 1 - i) * floorHeight;
            var floor = asFloor({}, i, yPos, errorHandler);
            return floor;
        });
        return floors;
    };
    creator.createElevators = function(elevatorCount, floorCount, floorHeight, elevatorCapacities) {
        elevatorCapacities = elevatorCapacities || [4];
        var currentX = 200.0;
        var elevators = _.map(_.range(elevatorCount), function(e, i) {
            var elevator = new Elevator(2.6, floorCount, floorHeight, elevatorCapacities[i%elevatorCapacities.length]);

            // Move to right x position
            elevator.moveTo(currentX, null);
            elevator.setFloorPosition(0);
            elevator.updateDisplayPosition();
            currentX += (20 + elevator.width);
            return elevator;
        });
        return elevators;
    };

    creator.createRandomUser = function() {
        var weight = _.random(55, 100);
        var user = new User(weight);
        if(_.random(40) === 0) {
            user.displayType = "child";
        } else if(_.random(1) === 0) {
            user.displayType = "female";
        } else {
            user.displayType = "male";
        }
        return user;
    };

    creator.spawnUserRandomly = function(floorCount, floorHeight, floors) {
        var user = creator.createRandomUser();
        user.moveTo(105+_.random(40), 0);
        var currentFloor = _.random(1) === 0 ? 0 : _.random(floorCount - 1);
        var destinationFloor;
        if(currentFloor === 0) {
            // Definitely going up
            destinationFloor = _.random(1, floorCount - 1);
        } else {
            // Usually going down, but sometimes not
            if(_.random(10) === 0) {
                destinationFloor = (currentFloor + _.random(1, floorCount - 1)) % floorCount;
            } else {
                destinationFloor = 0;
            }
        }
        user.appearOnFloor(floors[currentFloor], destinationFloor);
        return user;
    };

    creator.createWorld = function(options) {
        console.log("Creating world with options", options);
        var defaultOptions = { floorHeight: 50, floorCount: 4, elevatorCount: 2, spawnRate: 0.5 };
        options = _.defaults(_.clone(options), defaultOptions);
        var world = {floorHeight: options.floorHeight, transportedCounter: 0};
        riot.observable(world);

        var handleUserCodeError = function(e) {
            world.trigger("usercode_error", e);
        }

        world.floors = creator.createFloors(options.floorCount, world.floorHeight, handleUserCodeError);
        world.elevators = creator.createElevators(options.elevatorCount, options.floorCount, world.floorHeight, options.elevatorCapacities);
        world.elevatorInterfaces = _.map(world.elevators, function(e) { return asElevatorInterface({}, e, options.floorCount, handleUserCodeError); });
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
            // TODO: Optimize this loop?
            world.moveCount = _.reduce(world.elevators, function(sum, elevator) { return sum+elevator.moveCount; }, 0);
            world.trigger("stats_changed");
        };

        var registerUser = function(user) {
            world.users.push(user);
            user.updateDisplayPosition(true);
            user.spawnTimestamp = world.elapsedTime;
            world.trigger("new_user", user);
            user.on("exited_elevator", function() {
                world.transportedCounter++;
                world.maxWaitTime = Math.max(world.maxWaitTime, world.elapsedTime - user.spawnTimestamp);
                world.avgWaitTime = (world.avgWaitTime * (world.transportedCounter - 1) + (world.elapsedTime - user.spawnTimestamp)) / world.transportedCounter;
                recalculateStats();
            });
            user.updateDisplayPosition(true);
        };

        var handleElevAvailability = function(elevator) {
            // Use regular loops for memory/performance reasons
            // Notify floors first because overflowing users
            // will press buttons again.
            for(var i=0, len=world.floors.length; i<len; ++i) {
                var floor = world.floors[i];
                if(elevator.currentFloor === i) {
                    floor.elevatorAvailable(elevator);
                }
            }
            for(var users=world.users, i=0, len=users.length; i < len; ++i) {
                var user = users[i];
                if(user.currentFloor === elevator.currentFloor) {
                    user.elevatorAvailable(elevator, world.floors[elevator.currentFloor]);
                }
            }
        };

        // Bind them all together
        for(var i=0; i < world.elevators.length; ++i) {
            world.elevators[i].on("entrance_available", handleElevAvailability);
        }

        var handleButtonRepressing = function(eventName, floor) {
            // Need randomize iteration order or we'll tend to fill upp first elevator
            for(var i=0, len=world.elevators.length, offset=_.random(len-1); i < len; ++i) {
                var elevIndex = (i + offset) % len;
                var elevator = world.elevators[elevIndex];
                if( eventName === "up_button_pressed" && elevator.goingUpIndicator ||
                    eventName === "down_button_pressed" && elevator.goingDownIndicator) {

                    // Elevator is heading in correct direction, check for suitability
                    if(elevator.currentFloor === floor.level && elevator.isOnAFloor() && !elevator.isMoving && !elevator.isFull()) {
                        // Potentially suitable to get into
                        // Use the interface queue functionality to queue up this action
                        world.elevatorInterfaces[elevIndex].goToFloor(floor.level, true);
                        return;
                    }
                }
            }
        }

        // This will cause elevators to "re-arrive" at floors if someone presses an
        // appropriate button on the floor before the elevator has left.
        for(var i=0; i<world.floors.length; ++i) {
            world.floors[i].on("up_button_pressed down_button_pressed", handleButtonRepressing);
        };

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

            // Use regular for loops for performance and memory friendlyness
            for(var i=0, len=world.elevators.length; i < len; ++i) {
                var e = world.elevators[i];
                e.update(dt);
                e.updateElevatorMovement(dt);
            }
            for(var users=world.users, i=0, len=users.length; i < len; ++i) {
                var u = users[i];
                u.update(dt);
                world.maxWaitTime = Math.max(world.maxWaitTime, world.elapsedTime - u.spawnTimestamp);
            };

            for(var users=world.users, i=world.users.length-1; i>=0; i--) {
                var u = users[i];
                if(u.removeMe) {
                    users.splice(i, 1);
                }
            }
            
            recalculateStats();
        };

        world.updateDisplayPositions = function() {
            for(var i=0, len=world.elevators.length; i < len; ++i) {
                world.elevators[i].updateDisplayPosition();
            }
            for(var users=world.users, i=0, len=users.length; i < len; ++i) {
                users[i].updateDisplayPosition();
            }
        };


        world.unWind = function() {
            console.log("Unwinding", world);
            _.each(world.elevators.concat(world.elevatorInterfaces).concat(world.users).concat(world.floors).concat([world]), function(obj) {
                obj.off("*");
            });
            world.challengeEnded = true;
            world.elevators = world.elevatorInterfaces = world.users = world.floors = [];
        };

        world.init = function() {
            // Checking the floor queue of the elevators triggers the idle event here
            for(var i=0; i < world.elevatorInterfaces.length; ++i) {
                world.elevatorInterfaces[i].checkDestinationQueue();
            }
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
        var lastT = null;
        var firstUpdate = true;
        world.on("usercode_error", controller.handleUserCodeError);
        var updater = function(t) {
            if(!controller.isPaused && !world.challengeEnded && lastT !== null) {
                if(firstUpdate) {
                    firstUpdate = false;
                    // This logic prevents infite loops in usercode from breaking the page permanently - don't evaluate user code until game is unpaused.
                    try {
                        codeObj.init(world.elevatorInterfaces, world.floors);
                        world.init();
                    } catch(e) { controller.handleUserCodeError(e); }
                }

                var dt = (t - lastT);
                var scaledDt = dt * 0.001 * controller.timeScale;
                scaledDt = Math.min(scaledDt, dtMax * 3 * controller.timeScale); // Limit to prevent unhealthy substepping
                try {
                    codeObj.update(scaledDt, world.elevatorInterfaces, world.floors);
                } catch(e) { controller.handleUserCodeError(e); }
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

    controller.handleUserCodeError = function(e) {
        controller.setPaused(true);
        console.log("Usercode error on update", e);
        controller.trigger("usercode_error", e);
    };

    controller.setPaused = function(paused) {
        controller.isPaused = paused;
        controller.trigger("timescale_changed");
    };
    controller.setTimeScale = function(timeScale) {
        controller.timeScale = timeScale;
        controller.trigger("timescale_changed");
    };

    return controller;
};
