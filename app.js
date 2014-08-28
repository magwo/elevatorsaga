
window.testingImpl = '{\n    init: function(elevators, floors) {\n        var rotator = 0;\n        _.each(floors, function(floor) {\n            floor.on("up_button_pressed down_button_pressed", function() {\n                var elevator = elevators[(rotator++) % elevators.length];\n                elevator.queueGoToFloor(floor.level);\n            }); \n        });\n        _.each(elevators, function(elevator) {\n            elevator.on("floor_button_pressed", function(floorNum) {\n                elevator.queueGoToFloor(floorNum);\n            });\n            elevator.on("idle", function() {\n                elevator.queueGoToFloor(0);\n            });\n        });\n    },\n    update: function(dt, elevators, floors) {\n    }\n}';

var createEditor = function() {
    var lsKey = "elevatorCrushCode_v4"

    var cm = CodeMirror.fromTextArea(document.getElementById("code"), { lineNumbers: true, indentUnit: 4, indentWithTabs: false, theme: "solarized light", mode: "javascript" });

    var reset = function() {
        cm.setValue('{\n    init: function(elevators, floors) {\n        _.each(elevators, function(elevator) {\n            elevator.on("idle", function() {\n                // Go to all the floors\n                elevator.queueGoToFloor(0);\n                elevator.queueGoToFloor(1);\n            });\n        });\n    },\n    update: function(dt, elevators, floors) {\n    }\n}');
    };
    var saveCode = function() {
        localStorage.setItem(lsKey, cm.getValue());
        $("#save_message").text("Code saved " + new Date().toTimeString());
    };

    var existingCode = localStorage.getItem(lsKey);
    if(existingCode) {
        cm.setValue(existingCode);
    } else {
        reset();
    }

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

    returnObj = riot.observable({});
    returnObj.getCodeObj = function() {
        console.log("Getting code...");
        var code = cm.getValue();
        try {
            obj = eval("(" + code + ")");
            console.log("Code is", obj);
            if(typeof obj.init !== "function") {
                throw "Code must contain an init function";
            }
            if(typeof obj.update !== "function") {
                throw "Code must contain an update function";
            }
            returnObj.trigger("code_success");
        } catch(e) {
            returnObj.trigger("code_error", e);
            return null;
        }
        return obj;
    };

    $("#button_apply").click(function() {
        returnObj.trigger("apply_code");
    });
    return returnObj;
}



$(function() {
    var editor = createEditor();

    var $world = $(".innerworld");
    var $stats = $(".statscontainer");
    var $challenge = $(".challenge");
    var $codestatus = $(".codestatus");

    var floorTempl = document.getElementById("floor-template").innerHTML.trim();
    var elevatorTempl = document.getElementById("elevator-template").innerHTML.trim();
    var elevatorButtonTempl = document.getElementById("elevatorbutton-template").innerHTML.trim();
    var userTempl = document.getElementById("user-template").innerHTML.trim();
    var statsTempl = document.getElementById("stats-template").innerHTML.trim();
    var challengeTempl = document.getElementById("challenge-template").innerHTML.trim();
    var codeStatusTempl = document.getElementById("codestatus-template").innerHTML.trim();

    var worldCreator = createWorldCreator(timingService);
    var world = undefined;

    var currentChallengeIndex = 0;

    var startChallenge = function(challengeIndex, autoStart) {
        var timeScale = 1.0;
        if(typeof world != "undefined") {
            timeScale = world.timeScale;
            // Do any cleanup of pending timers etc that might be needed..
            world.unWind();
            // TODO: Investigate if memory leaks happen here
        }
        currentChallengeIndex = challengeIndex;
        world = worldCreator.createWorld(window.setTimeout, challenges[challengeIndex].options);
        world.on("code_error", function(e) {
            console.log("World raised code error", e);
            editor.trigger("code_error", e);
        });
        world.timeScale = timeScale;
        window.world = world;

        clearAll([$world, $stats]);
        presentStats($stats, world, statsTempl);
        presentChallenge($challenge, challenges[challengeIndex], world, challengeIndex + 1, challengeTempl);
        presentWorld($world, world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl);

        world.on("timescale_changed", function() {
            presentChallenge($challenge, challenges[challengeIndex], world, challengeIndex + 1, challengeTempl);
        });

        world.on("stats_changed", function() {
            var challengeStatus = challenges[challengeIndex].condition.evaluate(world);
            if(challengeStatus !== null) {
                world.setPaused(true);
                world.timingObj.cancelEverything = true;
                if(challengeStatus) {
                    alert("Challenge completed. Prepare for the next challenge...");
                    riot.route("#challenge" + (challengeIndex + 2));
                } else {
                    alert("Challenge failed. Maybe your program needs an improvement?");
                    startChallenge(challengeIndex, false);
                }
            }
        });

        var codeObj = editor.getCodeObj();
        world.init(codeObj);
        world.setPaused(!autoStart);
    };

    editor.on("apply_code", function() {
        startChallenge(currentChallengeIndex, true);
    });
    editor.on("code_success", function() {
        presentCodeStatus($codestatus, codeStatusTempl);
    });
    editor.on("code_error", function(error) {
        presentCodeStatus($codestatus, codeStatusTempl, error);
    });

    riot.route(function(path) {
        var match = path.match(/^#challenge(\d+)$/);
        if(match && match.length == 2) {
            var requestedChallenge = _.parseInt(match[1]) - 1;
            if(requestedChallenge >= 0 && requestedChallenge < challenges.length) {
                startChallenge(requestedChallenge, false);
                return;
            } else {
                console.log("Invalid challenge index", requestedChallenge);
            }
        } else {
            console.log("Invalid route detected", path);
        }
        console.log("Selecting challenge 1 as backup");
        setTimeout(function() {
            riot.route("#challenge1");
        }, 1);
        
    });

    // TODO: Load highest previously completed level from localstorage?
    startChallenge(currentChallengeIndex, false);
});