

$(function() {
    var $world = $(".innerworld");
    var $stats = $(".statscontainer");
    console.log("stats is", $stats);
    var floorTempl = document.getElementById("floor-template").innerHTML.trim();
    var elevatorTempl = document.getElementById("elevator-template").innerHTML.trim();
    var elevatorButtonTempl = document.getElementById("elevatorbutton-template").innerHTML.trim();
    var userTempl = document.getElementById("user-template").innerHTML.trim();
    var statsTempl = document.getElementById("stats-template").innerHTML.trim();

    var scope = createScope({}, $);

    scope.init();

    presentStats($stats, scope.world, statsTempl);
    presentWorld($world, scope.world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl);
});