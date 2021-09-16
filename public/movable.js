
var EPSILON = 0.00001;

var linearInterpolate = function(value0, value1, x) {
    return value0 + (value1 - value0) * x;
};
var powInterpolate = function(value0, value1, x, a) {
    return value0 + (value1 - value0) * Math.pow(x, a) / (Math.pow(x, a) + Math.pow(1-x, a));
};
var coolInterpolate = function(value0, value1, x) {
    return powInterpolate(value0, value1, x, 1.3);
};
var DEFAULT_INTERPOLATOR = coolInterpolate;

var _tmpPosStorage = [0,0];

function Movable() {
    newGuard(this, Movable);
    unobservable.Observable.call(this);
    var movable = this;
    movable.x = 0.0;
    movable.y = 0.0;
    movable.parent = null;
    movable.worldX = 0.0;
    movable.worldY = 0.0;
    movable.currentTask = null;

    movable.trigger('new_state', movable);
}
Movable.prototype = Object.create(unobservable.Observable.prototype);

Movable.prototype.updateDisplayPosition = function(forceTrigger) {
    this.getWorldPosition(_tmpPosStorage);
    var oldX = this.worldX;
    var oldY = this.worldY;
    this.worldX = _tmpPosStorage[0];
    this.worldY = _tmpPosStorage[1];
    if(oldX !== this.worldX || oldY !== this.worldY || forceTrigger === true) {
        this.trigger('new_display_state', this);
    }
};

Movable.prototype.moveTo = function(newX, newY) {
    if(newX !== null) { this.x = newX; }
    if(newY !== null) { this.y = newY; }
    this.trigger("new_state", this);
};

Movable.prototype.moveToFast = function(newX, newY) {
    this.x = newX;
    this.y = newY;
    this.trigger("new_state", this);
}

Movable.prototype.isBusy = function() {
    return this.currentTask !== null;
};

Movable.prototype.makeSureNotBusy = function() {
    if(this.isBusy()) {
        console.error("Attempt to use movable while it was busy", this);
        throw({message: "Object is busy - you should use callback", obj: this});
    }
};

Movable.prototype.wait = function(millis, cb) {
    this.makeSureNotBusy();
    var timeSpent = 0.0;
    var self = this;
    self.currentTask = function waitTask(dt) {
        timeSpent += dt;
        if(timeSpent > millis) {
            self.currentTask = null;
            if(cb) { cb(); }
        }
    };
};

Movable.prototype.moveToOverTime = function(newX, newY, timeToSpend, interpolator, cb) {
    this.makeSureNotBusy();
    this.currentTask = true;
    if(newX === null) { newX = this.x; }
    if(newY === null) { newY = this.y; }
    if(typeof interpolator === "undefined") { interpolator = DEFAULT_INTERPOLATOR; }
    var origX = this.x;
    var origY = this.y;
    var timeSpent = 0.0;
    var self = this;
    self.currentTask = function moveToOverTimeTask(dt) {
        timeSpent = Math.min(timeToSpend, timeSpent + dt);
        if(timeSpent === timeToSpend) { // Epsilon issues possibly?
            self.moveToFast(newX, newY);
            self.currentTask = null;
            if(cb) { cb(); }
        } else {
            var factor = timeSpent / timeToSpend;
            self.moveToFast(interpolator(origX, newX, factor), interpolator(origY, newY, factor));
        }
    };
};

Movable.prototype.update = function(dt) {
    if(this.currentTask !== null) {
        this.currentTask(dt);
    }
};

Movable.prototype.getWorldPosition = function(storage) {
    var resultX = this.x;
    var resultY = this.y;
    var currentParent = this.parent;
    while(currentParent !== null) {
        resultX += currentParent.x;
        resultY += currentParent.y;
        currentParent = currentParent.parent;
    }
    storage[0] = resultX;
    storage[1] = resultY;
};

Movable.prototype.setParent = function(movableParent) {
    var objWorld = [0,0];
    if(movableParent === null) {
        if(this.parent !== null) {
            this.getWorldPosition(objWorld);
            this.parent = null;
            this.moveToFast(objWorld[0], objWorld[1]);
        }
    } else {
        // Parent is being set a non-null movable
        this.getWorldPosition(objWorld);
        var parentWorld = [0,0];
        movableParent.getWorldPosition(parentWorld);
        this.parent = movableParent;
        this.moveToFast(objWorld[0] - parentWorld[0], objWorld[1] - parentWorld[1]);
    }
};
