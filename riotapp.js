

$(function() {
    var $world = $(".innerworld");
    var floorTempl = document.getElementById("floor-template").innerHTML.trim();
    var elevatorTempl = document.getElementById("elevator-template").innerHTML.trim();
    var elevatorButtonTempl = document.getElementById("elevatorbutton-template").innerHTML.trim();
    var userTempl = document.getElementById("user-template").innerHTML.trim();

    var scope = createScope({}, $);

    scope.init();

    presentWorld($world, scope.world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl);
});