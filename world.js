


var createWorldCreator = function(timingService) {
    var creator = {};

    creator.createFloors = function(floorCount, floorHeight) {
        var floors = _.map(_.range(floorCount), function(e, i) {
            var yPos = (floorCount - 1 - i) * floorHeight;
            var floor = asFloor({}, i, yPos);
            return floor;
        });
        return floors;
    };
    creator.createElevators = function(elevatorCount, floorCount, floorHeight) {
        var elevators = _.map(_.range(elevatorCount), function(e, i) {
            var elevator = asMovable({});
            elevator.moveTo(200+60*i, null);
            elevator = asElevator(elevator, 2.0, floorCount, floorHeight);
            elevator.setFloorPosition(1);
            return elevator;
        });
        return elevators;
    };

    creator.createRandomUser = function(floorCount, floorHeight) {
        var user = asMovable({});
        user = asUser(user, floorCount, floorHeight);
        if(Math.random() < 0.02) {
            user.displayType = "child";
        } else if(Math.random() < 0.5) {
            user.displayType = "female";
        } else {
            user.displayType = "male";
        }
        return user;
    }

    creator.spawnUserRandomly = function(floorCount, floorHeight, floors) {
        var user = creator.createRandomUser(floorCount, floorHeight);
        user = asUser(user, floorCount, floorHeight);
        user.moveTo(100+Math.random()*40, 0);
        var currentFloor = Math.random() < 0.5 ? 0 : getRandomInt(0, floorCount - 1);
        var destinationFloor;
        if(currentFloor === 0) {
            // Definitely going up
            destinationFloor = getRandomInt(1, floorCount - 1);
        } else {
            // Usually going down, but sometimes not
            if(Math.random() < 0.2) {
                destinationFloor = (currentFloor + getRandomInt(1, floorCount - 1)) % floorCount;
            } else {
                destinationFloor = 0;
            }
        }
        user.appearOnFloor(floors[currentFloor], destinationFloor);
        return user;
    }

    creator.createWorld = function(setTimeoutFunc, options, codeObj) {
        console.log("Creating world with options", options);
        var defaultOptions = { floorHeight: 50, floorCount: 4, elevatorCount: 2, spawnRate: 0.5 };
        options = _.defaults(_.clone(options), defaultOptions);
        console.log("Options after default are", options);
        var world = {floorHeight: options.floorHeight, transportedCounter: 0};
        riot.observable(world);
        
        // Conclusion: Need to implement our own timeout generator
        // to get reliable high time factor (>100)
        var timeScale = 3;
        world.timingObj = timingService.createTimingReplacement(setTimeoutFunc, timeScale);
        
        world.floors = creator.createFloors(options.floorCount, world.floorHeight);
        world.elevators = creator.createElevators(options.elevatorCount, options.floorCount, world.floorHeight);
        world.users = [];
        world.transportedCounter = 0;
        world.transportedPerSec = 0.0;
        world.elapsedTime = 0.0;

        var recalculateStats = function() {
            world.transportedPerSec = world.transportedCounter / (0.001 * world.elapsedTime);
            world.trigger("stats_changed");
        };

        var registerUser = function(user) {
            world.users.push(user);
            world.trigger("new_user", user);
            user.on("exited_elevator", function() {
                world.transportedCounter++;
                recalculateStats();
            });
        }
        world.timingObj.setInterval(1000/options.spawnRate, function(){
            registerUser(creator.spawnUserRandomly(options.floorCount, world.floorHeight, world.floors));
        });

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

        // Stats update ticker
        world.timingObj.setInterval(1000/(3/timeScale), function(dt) {
            recalculateStats();
        });

        // TODO: Need to turn this thing off when resetting?
        // Note: Division by timeScale lets us do high timescale without
        // destroying performance
        // Movables update ticker
        world.timingObj.setInterval(1000/(60/timeScale), function(dt) {
            world.elapsedTime += dt;
            _.each(world.elevators, function(e) { e.update(dt); });

            _.each(world.users, function(u) {
                if(u.done && typeof u.cleanupFunction === "function") {
                    // Conclusion: Be careful using "off" riot function from event handlers - it alters 
                    // riot's callback list resulting in uncalled event handlers.
                    u.cleanupFunction();
                    u.cleanupFunction = null;
                }
                u.update(dt); });
            _.remove(world.users, function(u) { return u.removeMe; });
        });


        world.unWind = function() {
            _.each(world.elevators.concat(world.users).concat(world.floors).concat([world]), function(obj) {
                obj.off("*");
                delete obj;
            });
            world.elevators = world.users = world.floors = [];
            world.timingObj.cancelEverything = true;
        }

        codeObj.init(options.floorCount, world.elevators, world.timingObj.setTimeout);

        return world;

        
    };

    return creator;
};
