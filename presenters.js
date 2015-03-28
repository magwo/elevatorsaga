
function clearAll($elems) {
    _.each($elems, function($elem) {
        $elem.empty();
    });
};

function setTransformPos(elem, x, y) {
    var style = "translate(" + x + "px," + y + "px)";
    elem.style["-ms-transform"] = style;
    elem.style["-webkit-transform"] = style;
    elem.style.transform = style;
};

function updateUserState($user, elem_user, user) {
    setTransformPos(elem_user, user.worldX, user.worldY);
    if(user.done) { $user.addClass("leaving"); }
};


function presentStats($parent, world) {

    var elem_transportedcounter = $parent.find(".transportedcounter").get(0),
        elem_elapsedtime = $parent.find(".elapsedtime").get(0),
        elem_transportedpersec = $parent.find(".transportedpersec").get(0),
        elem_avgwaittime = $parent.find(".avgwaittime").get(0),
        elem_maxwaittime = $parent.find(".maxwaittime").get(0),
        elem_movecount = $parent.find(".movecount").get(0);

    world.on("stats_display_changed", function updateStats() {
        elem_transportedcounter.innerHTML = world.transportedCounter;
        elem_elapsedtime.innerHTML = world.elapsedTime.toFixed(0) + "s";
        elem_transportedpersec.innerHTML = world.transportedPerSec.toPrecision(3);
        elem_avgwaittime.innerHTML = world.avgWaitTime.toFixed(1) + "s";
        elem_maxwaittime.innerHTML = world.maxWaitTime.toFixed(1) + "s";
        elem_movecount.innerHTML = world.moveCount;
    });
    world.trigger("stats_display_changed");
};

function presentChallenge($parent, challenge, app, world, worldController, challengeNum, challengeTempl) {
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
        if(worldController.timeScale < 40) {
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

function presentFeedback($parent, feedbackTempl, world, title, message, url) {
    $parent.html(riot.render(feedbackTempl, {title: title, message: message, url: url, paddingTop: world.floors.length * world.floorHeight * 0.2}));
    if(!url) {
        $parent.find("a").remove();
    }
};

function presentWorld($world, world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl) {
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

    function renderElevatorButtons(states) {
        return _.map(states, function(b, i) {
            return riot.render(elevatorButtonTempl, {floorNum: i, state: b ? "activated" : ""});
        }).join("");
    };
    function setUpElevator(e) {
        var $elevator = $(riot.render(elevatorTempl, {e: e}));
        var elem_elevator = $elevator.get(0);
        $elevator.on("click", ".buttonpress", function() {
            e.pressFloorButton(parseInt($(this).text()));
        });

        e.on("new_display_state", function updateElevatorPosition() {
            setTransformPos(elem_elevator, e.worldX, e.worldY);
        });
        e.on("new_current_floor", function(floor) {
            $elevator.find(".floorindicator").get(0).innerHTML = floor;
        });
        e.on("floor_buttons_changed", function(states) {
            $elevator.find(".buttonindicator").get(0).innerHTML = renderElevatorButtons(states);
        });
        e.on("indicatorstate_change", function(indicatorStates) {
            $elevator.find(".up").toggleClass("activated", indicatorStates.up);
            $elevator.find(".down").toggleClass("activated", indicatorStates.down);
        });
        e.trigger("floor_buttons_changed", e.buttonStates);
        e.trigger("new_state", e);
        e.trigger("new_display_state", e);
        return $elevator;
    }

    $world.append(_.map(world.elevators, function(e) {
        return setUpElevator(e);
    }));

    world.on("new_user", function(user) {
        var $user = $(riot.render(userTempl, {u: user, state: user.done ? "leaving" : ""}));
        var elem_user = $user.get(0);

        user.on("new_display_state", function() { updateUserState($user, elem_user, user); })
        user.on("removed", function() {
            $user.remove();
        });
        $world.append($user);
    });
};


function presentCodeStatus($parent, templ, error) {
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

function makeDemoFullscreen() {
    $("body .container > *").not(".world").css("visibility", "hidden");
    $("html, body, body .container, .world").css({width: "100%", margin: "0", "padding": 0});
};
