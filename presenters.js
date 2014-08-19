

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
            console.log("clicked!");
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
            $user.removeClass("leaving");
            if(user.done) { $user.addClass("leaving"); }
        });
        user.on("removed", function() {
            $user.remove();
        });
        $world.append($user);
    });
    

}