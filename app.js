


var createEditor = function() {
    var cm = CodeMirror.fromTextArea(document.getElementById("code"), { lineNumbers: true, indentUnit: 4, indentWithTabs: false, theme: "solarized light", mode: "javascript" });

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

    returnObj = {
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
    }
    riot.observable(returnObj);

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

    var floorTempl = document.getElementById("floor-template").innerHTML.trim();
    var elevatorTempl = document.getElementById("elevator-template").innerHTML.trim();
    var elevatorButtonTempl = document.getElementById("elevatorbutton-template").innerHTML.trim();
    var userTempl = document.getElementById("user-template").innerHTML.trim();
    var statsTempl = document.getElementById("stats-template").innerHTML.trim();
    var challengeTempl = document.getElementById("challenge-template").innerHTML.trim();

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
        world = worldCreator.createWorld(window.setTimeout, challenges[challengeIndex].options, editor.getCodeObj());
        world.timeScale = timeScale;
        world.paused = !autoStart;
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
                if(challengeStatus) {
                    alert("Challenge completed. Prepare for the next challenge...");
                    startChallenge(challengeIndex+1, false);
                } else {
                    alert("Challenge failed. Maybe your program needs an improvement?");
                    startChallenge(challengeIndex, false);
                }
            }
        });
    };

    editor.on("apply_code", function() {
        startChallenge(currentChallengeIndex, true);
    });

    // TODO: Load highest previously completed level from localstorage
    startChallenge(currentChallengeIndex, false);
});