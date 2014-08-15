

var TIMESTEP = 1000/30; // ms
var EPSILON = 0.00001;

var linearInterpolate = function(value0, value1, x) {
    return value0 + (value1 - value0) * x;
}
var powInterpolate = function(value0, value1, x, a) {
    return value0 + (value1 - value0) * Math.pow(x, a) / (Math.pow(x, a) + Math.pow(1-x, a));
}
var coolInterpolate = function(value0, value1, x) {
    return powInterpolate(value0, value1, x, 1.3);
}
var DEFAULT_INTERPOLATOR = coolInterpolate;


var asEmittingEvent = function(obj, eventName) {
    var handlers = [];
    obj[eventName] = function(handler, arg) {
        if(typeof handler !== "undefined") {
            handlers.push(handler);
        } else {
            _.each(handlers, function(h) { h(obj, arg); });
        }
    };
    return obj;
}

var asMovable = function(obj, setIntervalFunc, clearIntervalFunc, setTimeoutFunc) {
    obj.x = 0.0;
    obj.y = 0.0;
    obj.parent = null;

    obj.moveTo = function(newX, newY) {
        if(newX === null) { newX = obj.x; }
        if(newY === null) { newY = obj.y; }
        obj.x = newX;
        obj.y = newY;
        obj.onNewState();
    };

    obj.wait = function(millis, cb) {
        setTimeoutFunc(cb, millis);
    };

    obj.moveToOverTime = function(newX, newY, timeToSpend, interpolator, cb) {
        if(newX === null) { newX = obj.x; }
        if(newY === null) { newY = obj.y; }
        if(typeof interpolator === "undefined") { interpolator = DEFAULT_INTERPOLATOR; }
        var origX = obj.x;
        var origY = obj.y;
        var timeSpent = 0.0;
        var intervalId = setIntervalFunc(function (dt) {
            timeSpent = Math.min(timeToSpend, timeSpent + dt);
            if(timeSpent === timeToSpend) { // Epsilon issues?
                clearIntervalFunc(intervalId);
                obj.x = newX;
                obj.y = newY;
                if(cb) { cb(obj); }
            } else {
                var factor = timeSpent / timeToSpend;
                obj.x = interpolator(origX, newX, factor);
                obj.y = interpolator(origY, newY, factor);
            }
            obj.onNewState();
        }, TIMESTEP);
    };

    // obj.moveToPhysically = function(newX, newY, accelerationRate, maxVelocity, cb) {
    //     if(newX === null) { newX = obj.x; }
    //     if(newY === null) { newY = obj.y; }
    //     setIntervalFunc(function () {
            
    //     }, TIMESTEP);
    // }

    obj.setPosition = function(position) {
        obj.x = position[0];
        obj.y = position[1];
        obj.onNewState();
    }

    obj.getWorldPosition = function() {
        var resultX = obj.x;
        var resultY = obj.y;
        var currentParent = obj.parent;
        while(currentParent !== null) {
            resultX += currentParent.x;
            resultY += currentParent.y;
            currentParent = currentParent.parent;
        }
        return [resultX, resultY];
    };

    obj.setParent = function(movableParent) {
        if(movableParent === null) {
            if(obj.parent !== null) {
                // Parent was set from something to null - detach
                obj.setPosition(obj.getWorldPosition());
                obj.parent = null;
            }
        } else {
            var objWorld = obj.getWorldPosition();
            if(obj.parent !== null) {
                var parentWorld = parent.getWorldPosition();
                // TODO: FINISH WRITING THIS CODE
            }
        }
    };

    obj = asEmittingEvent(obj, "onNewState");

    obj.onNewState();
    return obj;
}