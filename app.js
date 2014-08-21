


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


var requireUserCountAtMinRate = function(userCount, minRate) {
    return {
        description: "Transport " + userCount + " people at " + minRate.toPrecision(2) + " per second or better",
        evaluate: function(world) {
            if(world.transportedCounter >= userCount) {
                return world.transportedPerSec >= minRate;
            } else {
                return null;
            }
        }
    }
};


var challenges = [
     {options: {floorCount: 3, elevatorCount: 1, spawnRate: 0.3}, condition: requireUserCountAtMinRate(15, 0.2)}
    ,{options: {floorCount: 5, elevatorCount: 1, spawnRate: 0.4}, condition: requireUserCountAtMinRate(20, 0.3)}
    ,{options: {floorCount: 4, elevatorCount: 2, spawnRate: 0.5}, condition: requireUserCountAtMinRate(25, 0.38)}
    ,{options: {floorCount: 8, elevatorCount: 2, spawnRate: 0.6}, condition: requireUserCountAtMinRate(30, 0.49)}
    ,{options: {floorCount: 6, elevatorCount: 4, spawnRate: 1.5}, condition: requireUserCountAtMinRate(70, 1.3)}
];


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

    var startChallenge = function(challengeIndex, oldWorld) {
        if(typeof oldWorld != "undefined") {
            // Do any cleanup of pending timers etc that might be needed..
            oldWorld.unWind();
            // TODO: Investigate if memory leaks happen here
        }
        var world = worldCreator.createWorld(window.setTimeout, challenges[challengeIndex].options, editor.getCodeObj());

        clearAll([$world, $stats]);
        presentStats($stats, world, statsTempl);
        presentChallenge($challenge, challenges[challengeIndex], challengeIndex + 1, challengeTempl);
        presentWorld($world, world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl);

        world.on("stats_changed", function() {
            var challengeStatus = challenges[challengeIndex].condition.evaluate(world);
            if(challengeStatus !== null) {
                if(challengeStatus) {
                    alert("Success! Challenge completed, loading next level...");
                    startChallenge(challengeIndex+1, world);
                } else {
                    alert("Failure! Not good enough, try again...");
                    startChallenge(challengeIndex, world);
                }
            }
        });
    };
    // TODO: Load highest completed level from localstorage
    startChallenge(0);
});