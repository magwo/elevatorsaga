

var TIMESTEP = 1000/30.0; // ms
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


var asMovable = function(obj, setIntervalFunc, setTimeoutFunc) {
    riot.observable(obj);

    obj.x = 0.0;
    obj.y = 0.0;
    obj.parent = null;
    obj.worldX = 0.0;
    obj.worldY = 0.0;
    obj.busy = false;

    obj.updateDisplayPosition = function() {
        var worldPos = obj.getWorldPosition();
        obj.worldX = worldPos[0];
        obj.worldY = worldPos[1];
    };

    obj.moveTo = function(newX, newY) {
        if(newX === null) { newX = obj.x; }
        if(newY === null) { newY = obj.y; }
        obj.setPosition([newX, newY]);
    };

    obj.makeSureNotBusy = function() {
        if(obj.busy) {
            console.error("Attempt to use movable while it was busy", obj);
            throw({message: "Object is busy - you should use callback", obj: obj});
        }
    }

    obj.wait = function(millis, cb) {
        obj.makeSureNotBusy();
        obj.busy = true;
        return setTimeoutFunc(millis, function() { obj.busy = false; if(cb) { cb() } });
    };

    obj.moveToOverTime = function(newX, newY, timeToSpend, interpolator, cb) {
        if(obj.makeSureNotBusy()) { return; }
        obj.busy = true;
        if(newX === null) { newX = obj.x; }
        if(newY === null) { newY = obj.y; }
        if(typeof interpolator === "undefined") { interpolator = DEFAULT_INTERPOLATOR; }
        var origX = obj.x;
        var origY = obj.y;
        var timeSpent = 0.0;
        var intervalHandle = setIntervalFunc(TIMESTEP, function (dt) {
            timeSpent = Math.min(timeToSpend, timeSpent + dt);
            if(timeSpent === timeToSpend) { // Epsilon issues?
                intervalHandle.cancel = true;
                obj.setPosition([newX, newY]);
                obj.busy = false;
                if(cb) { cb(); }
            } else {
                var factor = timeSpent / timeToSpend;
                obj.setPosition([interpolator(origX, newX, factor), interpolator(origY, newY, factor)]);
            }
        });
    };

    obj.setPosition = function(position) {
        obj.x = position[0];
        obj.y = position[1];
        obj.updateDisplayPosition();
        obj.trigger('new_state');
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

    obj.parentStateListener = function() {
        obj.updateDisplayPosition();
        obj.trigger('new_state', obj);
    };

    obj.setParent = function(movableParent) {
        if(obj.parent !== null) {
            // Clean up listener
            obj.parent.off("new_state", obj.parentStateListener);
        }
        if(movableParent === null) {
            if(obj.parent !== null) {
                var objWorld = obj.getWorldPosition();
                obj.parent = null;
                obj.setPosition(objWorld);
            }
        } else {
            // Parent is being set a non-null movable
            var objWorld = obj.getWorldPosition();
            var parentWorld = movableParent.getWorldPosition();
            obj.parent = movableParent;
            obj.setPosition([objWorld[0] - parentWorld[0], objWorld[1] - parentWorld[1]]);
            obj.trigger('new_state');
            movableParent.on("new_state", obj.parentStateListener);
        }
    };

    obj.trigger('new_state', obj);
    return obj;
}

