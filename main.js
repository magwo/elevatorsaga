

var timingSetInterval = function(f, dt) {
    var prevT = new Date().getTime();
    var currentT = prevT;
    var id = setInterval(function() {
        currentT = new Date().getTime();
        f(currentT - prevT);
        prevT = currentT;
    }, dt);
    return id;
}

var bindMovableToElement = function(obj, elem) {
    obj.onNewState(function(obj) {
        pos = obj.getWorldPosition();
        elem.css({left: pos[0], top: pos[1] });
    });
}

var bindElevatorFloorToElement = function(obj, elem) {
    obj.onNewCurrentFloor(function(obj) {
        elem.text(obj.currentFloor);
    });
}

var getRandomInt = function(min, max) {
    return min + Math.round(Math.random() * (max - min));
}

var userSpawner = null;
var stopper = null;
var counter = 0;
var startTime = 0;
var resetWorld = function() {
    if(stopper != null) {
        stopper.shouldStop = true;
    }
    stopper = {
        shouldStop: false,
        shouldContinue: function() { return !this.shouldStop; }
    };

    counter = 0;
    startTime = new Date().getTime();

    if(userSpawner != null) {
        console.log("Clearing", userSpawner);
        clearInterval(userSpawner);
    }
    $(".floor:not(.floorprototype)").remove();
    $(".elevator:not(.elevatorprototype)").remove();
    $(".user:not(.userprototype)").remove();
}


var createWorld = function(codeObj, floorCount, elevatorCount) {
    console.log("Creating world with", codeObj);
    console.log("Elevators are")

    var floorHeight = $(".floorprototype").outerHeight() + 10;
    $(".world").css("height", floorCount * floorHeight);
    
    var floors = _.map(_.range(floorCount), function(e, i){
        var floorElem = $(".floorprototype").clone().appendTo(".innerworld");
        floorElem.removeClass("floorprototype");
        floorElem.css({top: i*(floorElem.outerHeight() + 10)});
        floorElem.show();
        floorElem.find(".floornumber").text(floorCount - 1 - i);
        floorElem.find(".buttonindicator i").removeClass("on");
        return floorElem;
    });

    var users = [];

    var createUser = function() {
        var userElem = $(".userprototype").clone().appendTo(".innerworld");
        userElem.removeClass("userprototype");
        userElem.show();
        var user = asMovable({}, timingSetInterval, clearInterval, setTimeout);
        bindMovableToElement(user, userElem);
        user = asUser(user, floorCount, floorHeight);
        user.moveTo(100+Math.random()*40, 0);
        var currentFloor = Math.round() < 0.5 ? 0 : getRandomInt(0, floorCount - 1);
        user.setFloorPosition(currentFloor);
        user.destinationFloor = currentFloor === 0 ? getRandomInt(1, floorCount - 1) : 0;

        user.onExitedElevator(function() {
            counter++;
            setTimeout(function() {
                userElem.addClass("done");
            }, 500);
            
            
        });
        user.onRemovable(function() {
            userElem.remove();
            _.pull(users, user);
        })
        return user;
    }

    userSpawner = setInterval(function() { users.push(createUser()) }, 500);

    var elevators = _.map(_.range(elevatorCount), function(e, i){
        var elevatorElem = $(".elevatorprototype").clone().appendTo(".innerworld");
        elevatorElem.removeClass("elevatorprototype");
        elevatorElem.show();
        _.map(_.range(floorCount), function(e, i){
            var buttonElem = elevatorElem.find(".buttonpressprototype").clone().appendTo(elevatorElem.find(".buttonindicator"));
            buttonElem.removeClass("buttonpressprototype");
            buttonElem.text(i);
            buttonElem.show();
        });
        var elevator = asMovable({}, timingSetInterval, clearInterval, setTimeout);
        bindMovableToElement(elevator, elevatorElem);
        elevator.moveTo(200+60*i, null);
        elevator = asElevator(elevator, 2.0, floorCount, floorHeight);
        bindElevatorFloorToElement(elevator, elevatorElem.find(".floorindicator"));
        elevator.setFloorPosition(1);

        elevator.onEntranceAvailable(function() {
            _.forEach(users, function(user) {
                if(user.currentFloor === elevator.currentFloor) {
                    user.elevatorAvailable(elevator);
                }
            });
        });

        return elevator;
    });

    console.log("elevators are", elevators);
    console.log("stopper is", stopper);
    codeObj.init(floorCount, elevators, stopper);
}


var createEditor = function() {
    var cm = CodeMirror.fromTextArea(document.getElementById("code"), { lineNumbers: true, indentUnit: 4, indentWithTabs: false, theme: "solarized", mode: "javascript" });

    var reset = function() {
        cm.setValue("{\n    init: function(floorCount, elevators, stopper) {\n        _.each(elevators, function(elevator, index) {\n            async.whilst(stopper.shouldContinue, function(cbOuter) {\n                async.series([\n                    function(cb) { elevator.wait(1000, cb) },\n                    function(cb) { elevator.goToFloor(1 + Math.round((floorCount-2)*Math.random()), cb) },\n                    function(cb) { elevator.wait(1000, cb) },\n                    function(cb) { elevator.goToFloor(0, cb) },\n                ], function() { cbOuter() });\n            });\n        });\n    },\n    update: function(elevators, floors) {\n    }\n}");
    };
    var saveCode = function() {
        localStorage.setItem("develevateCode", cm.getValue());
        $("#save_message").text("Code saved " + new Date().toTimeString());
    };

    var applyCode = function () {
        resetWorld();
        var code = cm.getValue();
    
        obj = eval("(" + code + ")");
        if(typeof obj.init !== "function") {
            throw "Code object must contain an init function";
        }
        if(typeof obj.update !== "function") {
            throw "Code object must contain an update function";
        }
        createWorld(obj, 9, 7);
    };

    var existingCode = localStorage.getItem("develevateCode");
    if(existingCode) {
        cm.setValue(existingCode);
    } else {
        reset();
    }

    $("#button_apply").click(function() {
        try {
            applyCode();
            $('html, body').animate({
                scrollTop: ($(".world").offset().top - 20)
            }, 300);
        }
        catch(e) {
            console.log(e);
            alert("Could not apply code: " + e);
        }
    });

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

    setInterval(function() {
        var transportedPerSecond = counter / (0.001 * (new Date().getTime() - startTime));
        $(".stats").text("Transported: " + counter + " (" + transportedPerSecond.toPrecision(4) + " per sec)");
    }, 1000);

    var autoSaver = _.debounce(saveCode, 1000);
    cm.on("change", function() {
        autoSaver();
    });

    // Autorun
    applyCode();
}

$(function() {
    createEditor();

});