

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
        elem.css({top: obj.y, left: obj.x });
    });
}

var bindElevatorFloorToElement = function(obj, elem) {
    obj.onNewCurrentFloor(function(obj) {
        elem.text(obj.currentFloor);
    });
}

var resetWorld = function() {
    $(".floor:not(.floorprototype)").remove();
    $(".elevator:not(.elevatorprototype)").remove();
    $(".user:not(.userprototype)").remove();
}


var createWorld = function(codeObj, floorCount, elevatorCount) {
    console.log("Creating world with", codeObj);
    codeObj.init(2, 3);

    var floorHeight = $(".floorprototype").outerHeight() + 10;
    var floors = _.map(_.range(floorCount), function(e, i){
        var floorElem = $(".floorprototype").clone().appendTo(".innerworld");
        floorElem.removeClass("floorprototype");
        floorElem.css({top: i*(floorElem.outerHeight() + 10)});
        floorElem.show();
        floorElem.find(".floornumber").text(floorCount - 1 - i);
        floorElem.find(".buttonindicator i").removeClass("on");
    });

    var users = _.map(_.range(0), function(e, i) {
        var userElem = $(".userprototype").clone().appendTo(".innerworld");
        userElem.removeClass("userprototype");
        userElem.css({top: floorHeight-27, left: 10+20*i});
        userElem.show();
    });

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
        elevator.moveTo(100+60*i, null);
        elevator = asElevator(elevator, 2.0, floorCount, floorHeight);
        bindElevatorFloorToElement(elevator, elevatorElem.find(".floorindicator"));
        elevator.setFloorPosition(4);
        return elevator;
    });
    console.log("elevators are", elevators);
    codeObj.init(floorCount, elevators);
}


var createEditor = function() {
    var cm = CodeMirror.fromTextArea(document.getElementById("code"), { lineNumbers: true, indentUnit: 4, indentWithTabs: false, theme: "solarized", mode: "javascript" });
    console.log("code mirror is", cm);

    var reset = function() {
        cm.setValue("var foo = function()\n{alert('hey');\n}\nfoo();");
    };
    var saveCode = function() {
        localStorage.setItem("develevateCode", cm.getValue());
        $("#save_message").text("Code saved " + new Date().toTimeString());
    };

    var applyCode = function () {
        resetWorld();
        var code = cm.getValue();
        console.log("code is", code);
    
        obj = eval("(" + code + ")");
        if(typeof obj.init !== "function") {
            throw "Code object must contain an init function";
        }
        if(typeof obj.update !== "function") {
            throw "Code object must contain an update function";
        }
        createWorld(obj, 5, 14);
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

    var autoSaver = _.debounce(saveCode, 1000);
    cm.on("change", function() {
        autoSaver();
    });

    applyCode();
}

$(function() {
    createEditor();

});