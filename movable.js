
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

var asMovable = function(obj) {
    riot.observable(obj);

    obj.x = 0.0;
    obj.y = 0.0;
    obj.parent = null;
    obj.worldX = 0.0;
    obj.worldY = 0.0;
    obj.currentTask = null;

    obj.updateDisplayPosition = function() {
        var worldPos = obj.getWorldPosition();
        obj.worldX = worldPos[0];
        obj.worldY = worldPos[1];
        obj.trigger('new_state', obj);
    };

    obj.setPosition = function(position) {
        obj.x = position[0];
        obj.y = position[1];
        obj.trigger('new_state');
    }

    obj.moveTo = function(newX, newY) {
        if(newX === null) { newX = obj.x; }
        if(newY === null) { newY = obj.y; }
        obj.trigger('new_state');
        obj.setPosition([newX, newY]);
    };

    obj.isBusy = function() {
        return obj.currentTask !== null;
    }

    obj.makeSureNotBusy = function() {
        if(obj.isBusy()) {
            console.error("Attempt to use movable while it was busy", obj);
            throw({message: "Object is busy - you should use callback", obj: obj});
        }
    }

    obj.wait = function(millis, cb) {
        obj.makeSureNotBusy();
        var timeSpent = 0.0;
        obj.currentTask = function(dt) {
            timeSpent += dt;
            if(timeSpent > millis) {
                obj.currentTask = null;
                if(cb) { cb(); }
            }
        };
    };

    obj.moveToOverTime = function(newX, newY, timeToSpend, interpolator, cb) {
        obj.makeSureNotBusy();
        obj.currentTask = true;
        if(newX === null) { newX = obj.x; }
        if(newY === null) { newY = obj.y; }
        if(typeof interpolator === "undefined") { interpolator = DEFAULT_INTERPOLATOR; }
        var origX = obj.x;
        var origY = obj.y;
        var timeSpent = 0.0;

        obj.currentTask = function (dt) {
            timeSpent = Math.min(timeToSpend, timeSpent + dt);
            if(timeSpent === timeToSpend) { // Epsilon issues possibly?
                obj.setPosition([newX, newY]);
                obj.currentTask = null;
                if(cb) { cb(); }
            } else {
                var factor = timeSpent / timeToSpend;
                obj.setPosition([interpolator(origX, newX, factor), interpolator(origY, newY, factor)]);
            }
        };
    };

    obj.movePhysically = function(newX, newY, constantAcceleration, constantDeceleration, maxSpeed, cb) {
        obj.makeSureNotBusy();
        if(newX === null) { newX = obj.x; }
        if(newY === null) { newY = obj.y; }
        var origX = obj.x;
        var origY = obj.y;
        var speed = 0.0;
        var isStopping = false;
        var distanceToTravel = Math.sqrt(Math.pow(newX - obj.x, 2) + Math.pow(newY - obj.y, 2));
        var position = 0.0;
        obj.currentTask = function(dt) {
            if(position === distanceToTravel) {
                obj.currentTask = null;
                if(cb) { cb(); }
                return;
            }
            if(isStopping || position - distanceNeededToAchieveSpeed(speed, 0, constantDeceleration) > distanceToTravel) {
                // Use isStopping variable to prevent jerky behavior due to floating precision roundings
                isStopping = true;
                var desiredAcceleration = accelerationNeededToAchieveChangeDistance(speed, 0, Math.max(0.0000001, distanceToTravel - position));
                speed += desiredAcceleration * dt;
                speed = Math.max(0.000001, speed);
                if(speed <= 0.00001) {
                    speed = 0.0;
                    position = distanceToTravel;
                }
            } else if(speed < maxSpeed) {
                speed = Math.min(maxSpeed, speed + constantAcceleration * dt);
            }
            
            position += speed * dt;
            var posFactor = position / distanceToTravel;
            obj.setPosition([linearInterpolate(origX, newX, posFactor), linearInterpolate(origY, newY, posFactor)]);
        }
    };

    obj.update = function(dt) {
        if(obj.currentTask !== null) {
            obj.currentTask(dt);
        }
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
        }
    };

    obj.trigger('new_state', obj);
    return obj;
};