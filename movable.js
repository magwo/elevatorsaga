
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
    var movable = obj;

    riot.observable(obj);

    movable.x = 0.0;
    movable.y = 0.0;
    movable.parent = null;
    movable.worldX = 0.0;
    movable.worldY = 0.0;
    movable.currentTask = null;

    movable.updateDisplayPosition = function() {
        var worldPos = movable.getWorldPosition();
        movable.worldX = worldPos[0];
        movable.worldY = worldPos[1];
        movable.trigger('new_state', obj);
    };

    movable.setPosition = function(position) {
        movable.x = position[0];
        movable.y = position[1];
        movable.trigger('new_state');
    }

    movable.moveTo = function(newX, newY) {
        if(newX === null) { newX = movable.x; }
        if(newY === null) { newY = movable.y; }
        movable.trigger('new_state');
        movable.setPosition([newX, newY]);
    };

    movable.isBusy = function() {
        return movable.currentTask !== null;
    }

    movable.makeSureNotBusy = function() {
        if(movable.isBusy()) {
            console.error("Attempt to use movable while it was busy", obj);
            throw({message: "Object is busy - you should use callback", obj: obj});
        }
    }

    movable.wait = function(millis, cb) {
        movable.makeSureNotBusy();
        var timeSpent = 0.0;
        movable.currentTask = function(dt) {
            timeSpent += dt;
            if(timeSpent > millis) {
                movable.currentTask = null;
                if(cb) { cb(); }
            }
        };
    };

    movable.moveToOverTime = function(newX, newY, timeToSpend, interpolator, cb) {
        movable.makeSureNotBusy();
        movable.currentTask = true;
        if(newX === null) { newX = movable.x; }
        if(newY === null) { newY = movable.y; }
        if(typeof interpolator === "undefined") { interpolator = DEFAULT_INTERPOLATOR; }
        var origX = movable.x;
        var origY = movable.y;
        var timeSpent = 0.0;

        movable.currentTask = function (dt) {
            timeSpent = Math.min(timeToSpend, timeSpent + dt);
            if(timeSpent === timeToSpend) { // Epsilon issues possibly?
                movable.setPosition([newX, newY]);
                movable.currentTask = null;
                if(cb) { cb(); }
            } else {
                var factor = timeSpent / timeToSpend;
                movable.setPosition([interpolator(origX, newX, factor), interpolator(origY, newY, factor)]);
            }
        };
    };

    movable.movePhysically = function(newX, newY, constantAcceleration, constantDeceleration, maxSpeed, cb) {
        movable.makeSureNotBusy();
        if(newX === null) { newX = movable.x; }
        if(newY === null) { newY = movable.y; }
        var origX = movable.x;
        var origY = movable.y;
        var speed = 0.0;
        var isStopping = false;
        var distanceToTravel = Math.sqrt(Math.pow(newX - movable.x, 2) + Math.pow(newY - movable.y, 2));
        var position = 0.0;
        movable.currentTask = function(dt) {
            if(position === distanceToTravel) {
                movable.currentTask = null;
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
            movable.setPosition([linearInterpolate(origX, newX, posFactor), linearInterpolate(origY, newY, posFactor)]);
        }
    };

    movable.update = function(dt) {
        if(movable.currentTask !== null) {
            movable.currentTask(dt);
        }
    }

    movable.getWorldPosition = function() {
        var resultX = movable.x;
        var resultY = movable.y;
        var currentParent = movable.parent;
        while(currentParent !== null) {
            resultX += currentParent.x;
            resultY += currentParent.y;
            currentParent = currentParent.parent;
        }
        return [resultX, resultY];
    };

    movable.setParent = function(movableParent) {
        if(movableParent === null) {
            if(movable.parent !== null) {
                var objWorld = movable.getWorldPosition();
                movable.parent = null;
                movable.setPosition(objWorld);
            }
        } else {
            // Parent is being set a non-null movable
            var objWorld = movable.getWorldPosition();
            var parentWorld = movableParent.getWorldPosition();
            movable.parent = movableParent;
            movable.setPosition([objWorld[0] - parentWorld[0], objWorld[1] - parentWorld[1]]);
        }
    };

    movable.trigger('new_state', obj);
    return movable;
};