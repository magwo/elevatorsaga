
// Console shim
(function () {
    var f = function () {};
    if (!window.console) {
        window.console = {
            log:f, info:f, warn:f, debug:f, error:f
        };
    }
}());

var limitNumber = function(num, min, max) {
    return Math.min(max, Math.max(num, min));
}



// Simple Promise pattern using riot.observable
function Promise() {
    var self = riot.observable(this);
    self.resolution = null;
    $.map(['done', 'fail', 'always'], function(name) {
        self[name] = function(arg) {
            if($.isFunction(arg)) {
                self.one(name, arg);
                if(self.resolution === name) {
                    self.trigger(name);
                }
            } else {
                if(name === 'always') {
                    throw new Error('Invalid argument for "always" function: ' + arg);
                }
                if(self.resolution !== null) {
                    throw new Error('Can not resolve promise - already resolved to ' + self.resolution)
                }
                self.resolution = name;
                self.trigger(name, arg).trigger('always', arg);
            }
            return self;
        };
    });
}


window.distanceNeededToAchieveSpeed = function(currentSpeed, targetSpeed, acceleration) {
    // v² = u² + 2a * d
    var requiredDistance = (Math.pow(targetSpeed, 2) - Math.pow(currentSpeed, 2)) / (2 * acceleration);
    return requiredDistance;
}
window.accelerationNeededToAchieveChangeDistance = function(currentSpeed, targetSpeed, distance) {
    // v² = u² + 2a * d
    var requiredAcceleration = 0.5 * ((Math.pow(targetSpeed, 2) - Math.pow(currentSpeed, 2)) / distance);
    return requiredAcceleration;
}


var dateService = {
    nowMillis: function() { return new Date().getTime(); }
};

var timingService = {
    // This service solves several problems:
    // 1. setInterval/setTimeout not being externally controllable with regards to cancellation
    // 2. setInterval/setTimeout not supporting time scale factor
    // 3. setInterval/setTimeout not providing a delta time in the call
    createTimingReplacement: function(setTimeoutFunc, timeScale) {
        // Almost went insane writing this code
        // TODO: Could use promise objects?
        var thisObj = {timeScale: timeScale, disabled: false, cancelEverything: false};
        thisObj.setInterval = function(millis, fn) {
            var handle = { cancel: false };
            var prevT = dateService.nowMillis();

            var doCall = function() {
                var currentT = dateService.nowMillis();
                var dt = (currentT - prevT) * thisObj.timeScale;
                prevT = currentT;
                fn(dt);
            }
            var timeoutFunction = function() {
                if(!handle.cancel && !thisObj.cancelEverything) {
                    if(!thisObj.disabled) {
                        doCall();
                    }
                    setTimeoutFunc(timeoutFunction, millis / thisObj.timeScale);
                }
            };
            setTimeoutFunc(timeoutFunction, millis / thisObj.timeScale);
            return handle;
        };
        thisObj.setTimeout = function(millis, fn) {
            var handle = { cancel: false };
            var schedulationTime = dateService.nowMillis();
            setTimeoutFunc(function() {
                if(!handle.cancel && !thisObj.disabled && !thisObj.cancelEverything) {
                    var callTime = dateService.nowMillis();
                    var dt = (callTime - schedulationTime) * thisObj.timeScale;
                    fn(dt);
                }
            }, millis / thisObj.timeScale);
            return handle;
        };
        return thisObj;
    }
};
