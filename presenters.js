
var clearAll = function($elems) {
    _.each($elems, function($elem) {
        $elem.empty();
    });
};


var presentStats = function($parent, world) {
    var updateShownTimer = function() {
        var showTimer = world.showTimer();
        $parent.find(".fa").addClass("invisible");
        switch (showTimer) {
        // Don't search for strange/empty IDs
        case "Commute": case "Wait": case "Travel":
            $parent.find("#" + world.showTimer()).find("i").removeClass("invisible"); break;
        default: break;
        }
        _.each(world.users, function(u) { u.trigger("new_state"); });
    };
    var updateStats = function() {
        $parent.find("#spawnedCounter").text(world.spawnedCounter.toFixed());
        $parent.find("#transportedCounter").text(world.transportedCounter.toFixed());
        $parent.find("#elapsedTime").text(world.elapsedTime.toFixed(0) + "s");
        $parent.find("#transportedPerSec").text(world.transportedPerSec.toPrecision(3));
        $parent.find("#moveCount").text(world.moveCount.toFixed());
        $parent.find("#avgCommuteTime").text(world.avgCommuteTime.toFixed(1) + "s");
        $parent.find("#maxCommuteTime").text(world.maxCommuteTime.toFixed(1) + "s");
        $parent.find("#avgWaitTime").text(world.avgWaitTime.toFixed(1) + "s");
        $parent.find("#maxWaitTime").text(world.maxWaitTime.toFixed(1) + "s");
        $parent.find("#avgTravelTime").text(world.avgTravelTime.toFixed(1) + "s");
        $parent.find("#maxTravelTime").text(world.maxTravelTime.toFixed(1) + "s");
    };

    $parent.find(".set-timer-shown").on("click", function () {
        var newTimer = $(this).attr("id").toString();
        if (world.showTimer() == newTimer) {
            newTimer = ""; // Disables displaying user timers
        }
        world.showTimer(newTimer);
        updateShownTimer();
    });
    world.on("stats_display_changed", updateStats);
    world.trigger("stats_display_changed");
    updateShownTimer();
};

var presentChallenge = function($parent, challenge, app, world, worldController, challengeNum, challengeTempl) {
    var $challenge = $(riot.render(challengeTempl, {
        challenge: challenge,
        num: challengeNum,
        timeScale: worldController.timeScale.toFixed(0) + "x",
        startButtonText: world.challengeEnded ? "<i class='fa fa-repeat'></i> Restart" : (worldController.isPaused ? "Start" : "Pause")
    }));
    $parent.html($challenge);

    $parent.find(".startstop").on("click", function() {
        app.startStopOrRestart();
    });
    $parent.find(".timescale_increase").on("click", function(e) {
        e.preventDefault();
        if(worldController.timeScale < 20) {
            var timeScale = Math.round(worldController.timeScale * 1.618);
            worldController.setTimeScale(timeScale);
        }
    });
    $parent.find(".timescale_decrease").on("click", function(e) {
        e.preventDefault();
        var timeScale = Math.round(worldController.timeScale / 1.618);
        worldController.setTimeScale(timeScale);
    });
};

var presentFeedback = function($parent, feedbackTempl, world, title, message, url) {
    $parent.html(riot.render(feedbackTempl, {title: title, message: message, url: url, paddingTop: world.floors.length * world.floorHeight * 0.2}));
    if(!url) {
        $parent.find("a").remove();
    }
};

var presentWorld = function($world, world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl) {

    $world.css("height", world.floorHeight * world.floors.length);

    $world.append(_.map(world.floors, function(f) {
        var $floor = $(riot.render(floorTempl, f));
        f.on("buttonstate_change", function(buttonStates) {
            $floor.find(".up").toggleClass("activated", buttonStates.up !== "");
            $floor.find(".down").toggleClass("activated", buttonStates.down !== "");
        });
        $floor.find(".up").on("click", function() {
            f.pressUpButton();
        });
        $floor.find(".down").on("click", function() {
            f.pressDownButton();
        });
        return $floor;
    }));
    $world.find(".floor").first().find(".down").addClass("invisible");
    $world.find(".floor").last().find(".up").addClass("invisible");

    $world.append(_.map(world.elevators, function(e) {
        var renderButtons = function(states) {
            return _.map(states, function(b, i) {
                return riot.render(elevatorButtonTempl, {floorNum: i, state: b ? "activated" : ""});
            }).join("");
        };
        var buttonsHtml = renderButtons(e.buttonStates);
        var $elevator = $(riot.render(elevatorTempl, {e: e, buttons: buttonsHtml}));
        $elevator.on("click", ".buttonpress", function() {
            e.pressFloorButton(parseInt($(this).text()));
        });

        e.on("new_state", function() {
            $elevator.css({left: e.worldX, top: e.worldY});
        });
        e.on("new_current_floor", function(floor) {
            $elevator.find(".floorindicator").text(floor);
        });
        e.on("floor_buttons_changed", function(states) {
            $elevator.find(".buttonindicator").html(renderButtons(states));
        });
        e.on("indicatorstate_change", function(indicatorStates) {
            $elevator.find(".up").toggleClass("activated", indicatorStates.up);
            $elevator.find(".down").toggleClass("activated", indicatorStates.down);
        });
        return $elevator;
    }));

    world.on("new_user", function(user) {
        var $user = $(riot.render(userTempl, {u: user, state: user.done ? "leaving" : "", timer: "0"}));

        user.on("new_state", function() {
            var userTime;
            var $elem = $user.find(".timer");
            var oldTime = $elem.text();
            $user.css({left: user.worldX, top: user.worldY});
            if(user.done) { $user.addClass("leaving"); }
            switch (world.showTimer()) {
            case "Wait":
                userTime = (user.enterTimestamp||world.elapsedTime) - user.spawnTimestamp;
                break;
            case "Travel":
                if (user.enterTimestamp !== undefined) {
                    userTime = (user.exitTimestamp||world.elapsedTime) - user.enterTimestamp;
                }
                break;
            case "Commute":
                userTime = (user.exitTimestamp||world.elapsedTime) - user.spawnTimestamp;
                break;
            default:
                userTime = undefined;
                break;
            }
            if (userTime !== undefined) {
               userTime = Math.round(userTime).toFixed();
               if (oldTime !== userTime) {
                    $elem.text(userTime);
                }
            } else {
                if (oldTime !== "") {
                    $elem.text("");
                }
            }
        });
        user.on("removed", function() {
            $user.remove();
        });
        $world.append($user);
    });
};


var presentCodeStatus = function($parent, templ, error) {
    console.log(error);
    var errorDisplay = error ? "block" : "none";
    var successDisplay = error ? "none" : "block";
    var errorMessage = error;
    if(error && error.stack) {
        errorMessage = error.stack;
        errorMessage = errorMessage.replace(/\n/g, "<br>");
    }
    var status = riot.render(templ, {errorMessage: errorMessage, errorDisplay: errorDisplay, successDisplay: successDisplay});
    $parent.html(status);
};

var makeDemoFullscreen = function() {
    $("body .container > *").not(".world").css("visibility", "hidden");
    $("html, body, body .container, .world").css({width: "100%", margin: "0", "padding": 0});
};
