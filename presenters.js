

var presentWorld = function($world, world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl) {

    $world.css("height", world.floorHeight * world.floors.length);

    $world.append(_.map(world.floors, function(f) { return riot.render(floorTempl, f); }));

    $world.append(_.map(world.elevators, function(e) {
        var buttons = _.map(e.buttonStates, function(b, i) {return riot.render(elevatorButtonTempl, {floorNum: i, state: b ? "activated" : ""})});
        var buttonsHtml = buttons.join("");
        console.log("buttons is", buttons);
        var elevatorHtml = riot.render(elevatorTempl, {e: e, buttons: buttonsHtml});
        var $elevator = $(elevatorHtml);
        $elevator.on("click", ".buttonpress", function() {
            console.log("clicked!");
            e.pressFloorButton(parseInt($(this).text()));
        });

        e.on("new_state", function() {
            $elevator.css({left: e.worldX, top: e.worldY});
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