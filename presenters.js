
var clearAll = function($elems) {
    _.each($elems, function($elem) {
        $elem.empty();
    });
}


var presentStats = function($parent, world, statsTempl) {
    world.on("stats_changed", function() {
        $parent.html(riot.render(statsTempl, {
            transportedCounter: world.transportedCounter,
            elapsedTime: (world.elapsedTime*0.001).toFixed(0),
            transportedPerSec: world.transportedPerSec.toPrecision(3),
            avgWaitTime: (world.avgWaitTime*0.001).toFixed(1),
            maxWaitTime: (world.maxWaitTime*0.001).toFixed(1),
            moveCount: (world.moveCount)
        }));
    });
    world.trigger("stats_changed");
};

var presentChallenge = function($parent, challenge, app, challengeNum, challengeTempl) {
    var $challenge = $(riot.render(challengeTempl, {
        challenge: challenge, 
        num: challengeNum, 
        timeScale: world.timeScale.toFixed(0) + "x",
        startButtonText: world.timingObj.cancelEverything ? "<i class='fa fa-repeat'></i> Restart" : (world.paused ? "Start" : "Pause")
    }));
    $parent.html($challenge);

    $parent.find(".startstop").on("click", function() {
        app.startStopOrRestart();
    });
    $parent.find(".timescale_increase").on("click", function(e) {
        e.preventDefault();
        if(world.timeScale < 20) {
            world.timeScale = Math.round(world.timeScale * 1.618);
            world.trigger("timescale_changed");
        }
    });
    $parent.find(".timescale_decrease").on("click", function(e) {
        e.preventDefault();
        world.timeScale = Math.round(world.timeScale / 1.618);
        world.trigger("timescale_changed");
    });
}

var presentFeedback = function($parent, feedbackTempl, world, title, message, url) {
    $parent.html(riot.render(feedbackTempl, {title: title, message: message, url: url, paddingTop: world.floors.length * world.floorHeight * 0.2}));
    if(!url) {
        $parent.find("a").remove();
    }
}

var presentWorld = function($world, world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl) {

    $world.css("height", world.floorHeight * world.floors.length);

    $world.append(_.map(world.floors, function(f) {
        var $floor = $(riot.render(floorTempl, f));
        f.on("buttonstate_change", function(buttonStates) {
            $floor.find(".up").removeClass("activated").addClass(buttonStates.up ? "activated" : "");
            $floor.find(".down").removeClass("activated").addClass(buttonStates.down ? "activated" : "");
        });
        $floor.find(".up").on("click", function() {
            f.pressUpButton();
        });
        $floor.find(".down").on("click", function() {
            f.pressDownButton();
        });
        return $floor;
    }));

    $world.append(_.map(world.elevators, function(e) {
        var renderButtons = function(states) {
            return _.map(states, function(b, i) {
                return riot.render(elevatorButtonTempl, {floorNum: i, state: b ? "activated" : ""})
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
        return $elevator;
    }));

    world.on("new_user", function(user) {
        var $user = $(riot.render(userTempl, {u: user, state: user.done ? "leaving" : ""}));
        
        user.on("new_state", function() {
            $user.css({left: user.worldX, top: user.worldY});
            if(user.done) { $user.addClass("leaving"); }
        });
        user.on("removed", function() {
            $user.remove();
        });
        $world.append($user);
    });
}


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
}

var makeDemoFullscreen = function() {
    $("body .container > *").not(".world").css("visibility", "hidden");
    $("html, body, body .container, .world").css({width: "100%", margin: "0", "padding": 0});
}
