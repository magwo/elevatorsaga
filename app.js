
window.testingImpl = '{\n    init: function(elevators, floors) {\n        var rotator = 0;\n        _.each(floors, function(floor) {\n            floor.on("up_button_pressed down_button_pressed", function() {\n                var elevator = elevators[(rotator++) % elevators.length];\n                elevator.goToFloor(floor.level);\n            }); \n        });\n        _.each(elevators, function(elevator) {\n            elevator.on("floor_button_pressed", function(floorNum) {\n                elevator.goToFloor(floorNum);\n            });\n            elevator.on("idle", function() {\n                elevator.goToFloor(0);\n            });\n        });\n    },\n    update: function(dt, elevators, floors) {\n    }\n}';

var createEditor = function() {
    var lsKey = "elevatorCrushCode_v5"

    var cm = CodeMirror.fromTextArea(document.getElementById("code"), {
        lineNumbers: true,
        indentUnit: 4,
        indentWithTabs: false,
        theme: "solarized light",
        mode: "javascript",
        extraKeys: {
            Tab: function(cm) {
                var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
                cm.replaceSelection(spaces);
            }
        }
    });

    var reset = function() {
        cm.setValue($("#default-elev-implementation").text().trim());
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
    returnObj.setCode = function(code) {
        cm.setValue(code);
    };

    $("#button_apply").click(function() {
        returnObj.trigger("apply_code");
    });
    return returnObj;
}


var createParamsUrl = function(current, overrides) {
    return "#" + _.map(_.merge(current, overrides), function(val, key) {
        return key + "=" + val;
    }).join(",");
};



$(function() {
    var editor = createEditor();

    var params = {};

    var $world = $(".innerworld");
    var $stats = $(".statscontainer");
    var $feedback = $(".feedbackcontainer");
    var $challenge = $(".challenge");
    var $codestatus = $(".codestatus");

    var floorTempl = document.getElementById("floor-template").innerHTML.trim();
    var elevatorTempl = document.getElementById("elevator-template").innerHTML.trim();
    var elevatorButtonTempl = document.getElementById("elevatorbutton-template").innerHTML.trim();
    var userTempl = document.getElementById("user-template").innerHTML.trim();
    var statsTempl = document.getElementById("stats-template").innerHTML.trim();
    var challengeTempl = document.getElementById("challenge-template").innerHTML.trim();
    var feedbackTempl = document.getElementById("feedback-template").innerHTML.trim();
    var codeStatusTempl = document.getElementById("codestatus-template").innerHTML.trim();

    var app = riot.observable({});
    app.worldController = createWorldController(1.0 / 60.0);
    app.worldController.on("code_error", function(e) {
        console.log("World raised code error", e);
        editor.trigger("code_error", e);
    });
    
    console.log(app.worldController);
    app.worldCreator = createWorldCreator();
    app.world = undefined;

    app.currentChallengeIndex = 0;

    app.startStopOrRestart = function() {
        if(app.world.challengeEnded) {
            app.startChallenge(app.currentChallengeIndex);
        } else {
            app.worldController.setPaused(!app.worldController.isPaused);
        }
    };

    app.startChallenge = function(challengeIndex, autoStart) {
        if(typeof app.world != "undefined") {
            app.world.unWind();
            // TODO: Investigate if memory leaks happen here
        }
        app.currentChallengeIndex = challengeIndex;
        app.world = app.worldCreator.createWorld(challenges[challengeIndex].options);
        window.world = app.world;

        clearAll([$world, $stats, $feedback]);
        presentStats($stats, app.world, statsTempl);
        presentChallenge($challenge, challenges[challengeIndex], app, app.world, app.worldController, challengeIndex + 1, challengeTempl);
        presentWorld($world, app.world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl);

        app.worldController.on("timescale_changed", function() {
            presentChallenge($challenge, challenges[challengeIndex], app, app.world, app.worldController, challengeIndex + 1, challengeTempl);
        });

        app.world.on("stats_changed", function() {
            var challengeStatus = challenges[challengeIndex].condition.evaluate(app.world);
            if(challengeStatus !== null) {
                app.world.challengeEnded = true;
                app.worldController.setPaused(true);
                if(challengeStatus) {
                    presentFeedback($feedback, feedbackTempl, app.world, "Success!", "Challenge completed", createParamsUrl(params, { challenge: (challengeIndex + 2)}));
                    
                } else {
                    presentFeedback($feedback, feedbackTempl, app.world, "Challenge failed", "Maybe your program needs an improvement?", "");
                }
            }
        });

        var codeObj = editor.getCodeObj();
        console.log("Starting...");
        app.worldController.start(app.world, codeObj, window.requestAnimationFrame, autoStart);
    };

    editor.on("apply_code", function() {
        app.startChallenge(app.currentChallengeIndex, true);
    });
    editor.on("code_success", function() {
        presentCodeStatus($codestatus, codeStatusTempl);
    });
    editor.on("code_error", function(error) {
        presentCodeStatus($codestatus, codeStatusTempl, error);
    });

    riot.route(function(path) {
        params = _.reduce(path.split(","), function(result, p) {
            var match = p.match(/(\w+)=(\w+$)/);
            if(match) { result[match[1]] = match[2]; } return result;
        }, {});
        var requestedChallenge = -1;
        var autoStart = false;
        var timeScale = 2.0;
        _.each(params, function(val, key) {
            if(key === "challenge") {
                requestedChallenge = _.parseInt(val) - 1;
                if(requestedChallenge < 0 || requestedChallenge >= challenges.length) {
                    requestedChallenge = -1;
                    console.log("Invalid challenge index", requestedChallenge);
                }
            } else if(key === "autostart") {
                autoStart = val === "false" ? false : true;
            } else if(key === "timescale") {
                timeScale = parseFloat(val);
            } else if(key === "devtest") {
                editor.setCode(testingImpl);
            } else if(key === "fullscreen") {
                makeDemoFullscreen();
            }
        });
        app.worldController.setTimeScale(timeScale);

        if(requestedChallenge >= 0) {
            app.startChallenge(requestedChallenge, autoStart);
        } else {
            console.log("Defaulting challenge to 1", requestedChallenge);
            setTimeout(function() {
                riot.route(createParamsUrl(params, { challenge: 1 }));
            }, 1);
        }
    });
});