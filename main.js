
var getRandomInt = function(min, max) {
    return min + Math.round(Math.random() * (max - min));
}

var elevatorApp = angular.module('elevatorApp', []);

elevatorApp.service("dateService", function() {
    return {
        nowMillis: function() { return new Date().getTime(); }
    }
});

elevatorApp.service("timingService", function($timeout, dateService) {
    // This service solves several problems:
    // 1. setInterval/setTimeout not being externally controllable with regards to cancellation
    // 2. setInterval/setTimeout not triggering angular dirty checks
    // 3. setInterval/setTimeout not supporting time scale factor
    // 4. setInterval/setTimeout not providing a delta time in the call
    return {
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
                        $timeout(timeoutFunction, millis / thisObj.timeScale);
                    }
                }
                $timeout(timeoutFunction, millis / thisObj.timeScale);
                return handle;
            };
            return thisObj;
        },
        createSetTimeoutReplacement: function(timeScale) {
            var thisObj = {timeScale: timeScale, disabled: false};
            thisObj.setTimeout = function(millis, fn) {
                var handle = { cancel: false };
                var schedulationTime = dateService.nowMillis();
                $timeout(function() {
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
    }
});


elevatorApp.controller("WorldController", function($scope, $document, timingService, dateService) {
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
    $scope.createElevators = function(elevatorCount, floorCount, floorHeight, intervalSetter, timeoutSetter) {
        var elevators = _.map(_.range(elevatorCount), function(e, i) {
            var elevator = asMovable({}, intervalSetter, timeoutSetter);
            elevator.moveTo(200+60*i, null);
            elevator = asElevator(elevator, 2.0, floorCount, floorHeight);
            elevator.setFloorPosition(1);
            return elevator;
        });
        return elevators;
    };

    $scope.createRandomUser = function(floorCount, floorHeight, intervalSetter, timeoutSetter) {
        var user = asMovable({}, intervalSetter, timeoutSetter);
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

    $scope.spawnUserRandomly = function(floorCount, floorHeight, floors, intervalSetter, timeoutSetter) {
        var user = $scope.createRandomUser(floorCount, floorHeight, intervalSetter, timeoutSetter);
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
        
        world.timeoutObj = timingService.createSetTimeoutReplacement(1.0);
        world.intervalObj = timingService.createSetIntervalReplacement(1.0);
        
        world.floors = $scope.createFloors(options.floorCount, floorHeight);
        world.elevators = $scope.createElevators(options.elevatorCount, options.floorCount, floorHeight, world.intervalObj.setInterval, world.timeoutObj.setTimeout);
        world.users = [];
        world.transportedCounter = 0;
        world.transportedPerSec = 0.0;
        world.startTime = dateService.nowMillis();

        var registerUser = function(user) {
            world.users.push(user);
            user.onExitedElevator(function() {
                world.transportedCounter++;
                world.transportedPerSec = world.transportedCounter / (0.001 * (dateService.nowMillis() - world.startTime));
            });
            user.onRemovable(function() {
                _.pull(world.users, user);
            });
        }
        world.intervalObj.setInterval(500, function(){
            registerUser($scope.spawnUserRandomly(options.floorCount, floorHeight, world.floors, world.intervalObj.setInterval, world.timeoutObj.setTimeout));
        });

        // Bind them all together
        _.each(world.elevators, function(elevator) {
            elevator.onEntranceAvailable(function() {
                // Order of floors/user is significant, because overflowing users
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

        codeObj.init(options.floorCount, world.elevators, world.timeoutObj.setTimeout);
    }

    $scope.init = function() {
        $document.ready(function() {
            // TODO: Could make editor stuff into a service or something...
            // This line fucks with testability
            $scope.editor = createEditor();

            // setInterval(function() {
            //     var transportedPerSecond = counter / (0.001 * (new Date().getTime() - startTime));
            //     $(".stats").text("Transported: " + counter + " (" + transportedPerSecond.toPrecision(4) + " per sec)");
            // }, 1000);

            $scope.createWorld({floorCount: 6, elevatorCount: 4}, $scope.editor.getCodeObj());
            $scope.$apply();
        });
    };
});

var createEditor = function() {
    var cm = CodeMirror.fromTextArea(document.getElementById("code"), { lineNumbers: true, indentUnit: 4, indentWithTabs: false, theme: "solarized", mode: "javascript" });

    var reset = function() {
        cm.setValue("{ init: function(){}, update: function() {} }"); //"{\n    init: function(floorCount, elevators, stopper) {\n        _.each(elevators, function(elevator, index) {\n            async.whilst(stopper.shouldContinue, function(cbOuter) {\n                async.series([\n                    function(cb) { elevator.wait(1000, cb) },\n                    function(cb) { elevator.goToFloor(1 + Math.round((floorCount-2)*Math.random()), cb) },\n                    function(cb) { elevator.wait(1000, cb) },\n                    function(cb) { elevator.goToFloor(0, cb) },\n                ], function() { cbOuter() });\n            });\n        });\n    },\n    update: function(elevators, floors) {\n    }\n}");
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
