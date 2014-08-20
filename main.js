
var timeout = window.setTimeout;

var getRandomInt = function(min, max) {
    return min + Math.round(Math.random() * (max - min));
}

var dateService = {
    nowMillis: function() { return new Date().getTime(); }
};

var timingService = {
    // This service solves several problems:
    // 1. setInterval/setTimeout not being externally controllable with regards to cancellation
    // 2. setInterval/setTimeout not supporting time scale factor
    // 3. setInterval/setTimeout not providing a delta time in the call
    createSetIntervalReplacement: function(timeScale) {
        // Almost went insane writing this code
        // TODO: Could use promise object?
        var thisObj = {timeScale: timeScale, disabled: false};
        thisObj.setInterval = function(millis, fn) {
            var handle = { cancel: false };
            var prevT = dateService.nowMillis();

            var doCall = function() {
                var currentT = dateService.nowMillis();
                var dt = (currentT - prevT) * thisObj.timeScale;
                prevT = currentT;
                fn(dt);
            }
            var timeoutFunction = function() {
                if(!handle.cancel) {
                    if(!thisObj.disabled) {
                        doCall();
                    }
                    timeout(timeoutFunction, millis / thisObj.timeScale);
                }
            }
            timeout(timeoutFunction, millis / thisObj.timeScale);
            return handle;
        };
        return thisObj;
    },
    createSetTimeoutReplacement: function(timeScale) {
        var thisObj = {timeScale: timeScale, disabled: false};
        thisObj.setTimeout = function(millis, fn) {
            var handle = { cancel: false };
            var schedulationTime = dateService.nowMillis();
            timeout(function() {
                if(!handle.cancel && !thisObj.disabled) {
                    var callTime = dateService.nowMillis();
                    var dt = (callTime - schedulationTime) * thisObj.timeScale;
                    fn(dt);
                }
            }, millis / thisObj.timeScale);
            return handle;
        };
        return thisObj;
    }
};


 var createScope = function($scope, $) {
    window.controller = $scope;
    window.timingService = timingService;
    $scope.execMode = "code";
    $scope.world = {};

    $scope.newExecutionMode = function() {
        // TODO: Fix brokenness
        if($scope.execMode === "code") {
            $scope.world.timeoutObj.disabled = false;
            $scope.world.intervalObj.disabled = false;
        } else if($scope.execmode === "manual") {
            $scope.world.timeoutObj.disabled = true;
            $scope.world.intervalObj.disabled = true;
        }
    }

    $scope.createFloors = function(floorCount, floorHeight) {
        var floors = _.map(_.range(floorCount), function(e, i) {
            var yPos = (floorCount - 1 - i) * floorHeight;
            var floor = asFloor({}, i, yPos);
            return floor;
        });
        return floors;
    };
    $scope.createElevators = function(elevatorCount, floorCount, floorHeight) {
        var elevators = _.map(_.range(elevatorCount), function(e, i) {
            var elevator = asMovable({});
            elevator.moveTo(200+60*i, null);
            elevator = asElevator(elevator, 2.0, floorCount, floorHeight);
            elevator.setFloorPosition(1);
            return elevator;
        });
        return elevators;
    };

    $scope.createRandomUser = function(floorCount, floorHeight) {
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

    $scope.spawnUserRandomly = function(floorCount, floorHeight, floors) {
        var user = $scope.createRandomUser(floorCount, floorHeight);
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

    $scope.createWorld = function(options, codeObj) {
        console.log("CREATING WORLD");
        console.log("options is", options);
        var floorHeight = 50;
        var world = {floorHeight: floorHeight, transportedCounter: 0};
        
        // Conclusion: Need to implement our own timeout generator
        // to get reliable high-speed time
        var timeScale = 2;

        world.timeoutObj = timingService.createSetTimeoutReplacement(timeScale);
        world.intervalObj = timingService.createSetIntervalReplacement(timeScale);
        
        world.floors = $scope.createFloors(options.floorCount, floorHeight);
        world.elevators = $scope.createElevators(options.elevatorCount, options.floorCount, floorHeight);
        world.users = [];
        world.transportedCounter = 0;
        world.transportedPerSec = 0.0;
        world.startTime = dateService.nowMillis();

        riot.observable(world);

        var registerUser = function(user) {
            world.users.push(user);
            world.trigger("new_user", user);
            user.on("exited_elevator", function() {
                world.transportedCounter++;
                world.transportedPerSec = world.transportedCounter / (0.001 * (dateService.nowMillis() - world.startTime));
                world.trigger("stats_changed");
            });
        }
        world.intervalObj.setInterval(500, function(){
            registerUser($scope.spawnUserRandomly(options.floorCount, floorHeight, world.floors));
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

        console.log("SETTING WORLD", world);
        $scope.world = world;

        // TODO: Need to turn this thing off when resetting?
        // Note: Division by timeScale lets us do high timescale without
        // destroying performance
        world.intervalObj.setInterval(1000/(60/timeScale), function(dt) {
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

        codeObj.init(options.floorCount, world.elevators, world.timeoutObj.setTimeout);
    }

    $scope.init = function() {
        // TODO: Could make editor stuff into a service or something...
        // This line fucks with testability
        $scope.editor = createEditor();


        $scope.createWorld({floorCount: 8, elevatorCount: 8}, $scope.editor.getCodeObj());
    };

    return $scope;
};

var createEditor = function() {
    var cm = CodeMirror.fromTextArea(document.getElementById("code"), { lineNumbers: true, indentUnit: 4, indentWithTabs: false, theme: "solarized", mode: "javascript" });

    var reset = function() {
        cm.setValue("{\n    init: function(floorCount, elevators, timeoutSetter) {\n        var doMovement = function(e, i) {\n            e.goToFloor(Math.round(Math.random()*(floorCount - 1)), function() {\n                e.wait(1000, function() {\n                    e.goToFloor(e.getFirstPressedFloor(), function() {\n                        e.wait(1000, function() {\n                            timeoutSetter(0, function() {\n                                doMovement(e, i);\n                            });\n                        });\n                    });\n                });\n            });\n        };\n        _.each(elevators, function(e, i) {\n            doMovement(e, i);\n        });\n    },\n    update: function() {\n    }\n}");
    };
    var saveCode = function() {
        localStorage.setItem("develevateCode", cm.getValue());
        $("#save_message").text("Code saved " + new Date().toTimeString());
    };


    var existingCode = localStorage.getItem("develevateCode");
    if(existingCode) {
        cm.setValue(existingCode);
    } else {
        reset();
    }

    // $("#button_apply").click(function() {
    //     try {
    //         applyCode();
    //         $('html, body').animate({
    //             scrollTop: ($(".world").offset().top - 20)
    //         }, 300);
    //     }
    //     catch(e) {
    //         console.log(e);
    //         alert("Could not apply code: " + e);
    //     }
    // });

    $("#button_save").click(function() {
        saveCode();
        cm.focus();
    });

    $("#button_reset").click(function() {
        if(confirm("Do you really want to reset to the default implementation?")) {
            localStorage.setItem("develevateBackupCode", cm.getValue());
            reset();
        }
        cm.focus();
    });

    $("#button_resetundo").click(function() {
        if(confirm("Do you want to bring back the code as before the last reset?")) {
            cm.setValue(localStorage.getItem("develevateBackupCode") || "");
        }
        cm.focus();
    });

    var autoSaver = _.debounce(saveCode, 1000);
    cm.on("change", function() {
        autoSaver();
    });

    return {
        getCode: function() {
            return cm.getValue();
        },
        getCodeObj: function() {
            console.log("Getting code...");
            var code = cm.getValue();
            obj = eval("(" + code + ")");
            console.log("Code is", obj);
            if(typeof obj.init !== "function") {
                throw "Code object must contain an init function";
            }
            if(typeof obj.update !== "function") {
                throw "Code object must contain an update function";
            }
            return obj;
        }
    };
}
