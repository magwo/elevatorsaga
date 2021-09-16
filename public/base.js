// Console shim
(function () {
    var f = function () {};
    if (!console) {
        console = {
            log:f, info:f, warn:f, debug:f, error:f
        };
    }
}());

var limitNumber = function(num, min, max) {
    return Math.min(max, Math.max(num, min));
};

var epsilonEquals = function(a, b) {
    return Math.abs(a-b) < 0.00000001;
};

// Polyfill from MDN
var sign = function(x) {
    x = +x; // convert to a number
    if (x === 0 || isNaN(x)){
        return x;
    }
    return x > 0 ? 1 : -1;
};
if(typeof Math.sign === "undefined") {
    Math.sign = sign;
}

var deprecationWarning = function(name) {
    console.warn("You are using a deprecated feature scheduled for removal: " + name);
};

var newGuard = function(obj, type) {
    if(!(obj instanceof type)) { throw "Incorrect instantiation, got " + typeof obj + " but expected " + type; }
}

var createBoolPassthroughFunction = function(owner, obj, objPropertyName) {
    return function(val) {
        if(typeof val !== "undefined") {
            obj[objPropertyName] = val ? true : false;
            obj.trigger("change:" + objPropertyName, obj[objPropertyName]);
            return owner;
        } else {
            return obj[objPropertyName];
        }
    };
};

distanceNeededToAchieveSpeed = function(currentSpeed, targetSpeed, acceleration) {
    // v² = u² + 2a * d
    var requiredDistance = (Math.pow(targetSpeed, 2) - Math.pow(currentSpeed, 2)) / (2 * acceleration);
    return requiredDistance;
};
accelerationNeededToAchieveChangeDistance = function(currentSpeed, targetSpeed, distance) {
    // v² = u² + 2a * d
    var requiredAcceleration = 0.5 * ((Math.pow(targetSpeed, 2) - Math.pow(currentSpeed, 2)) / distance);
    return requiredAcceleration;
};

// Fake frame requester helper used for testing and fitness simulations
var createFrameRequester = function(timeStep) {
    var currentCb = null;
    var requester = {};
    requester.currentT = 0.0;
    requester.register = function(cb) { currentCb = cb; };
    requester.trigger = function() { requester.currentT += timeStep; if(currentCb !== null) { currentCb(requester.currentT); } };
    return requester;
};

var getCodeObjFromCode = function(code) {
    if (code.trim().substr(0,1) == "{" && code.trim().substr(-1,1) == "}") {
        code = "(" + code + ")";
    }
    /* jslint evil:true */
    obj = eval(code);
    /* jshint evil:false */
    if(typeof obj.init !== "function") {
        throw "Code must contain an init function";
    }
    if(typeof obj.update !== "function") {
        throw "Code must contain an update function";
    }
    return obj;
}

