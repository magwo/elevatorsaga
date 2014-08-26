

var limitNumber = function(num, min, max) {
    return Math.min(max, Math.max(num, min));
}


// A generic promiese interface by using riot.observable
// Borrowed from https://github.com/muut/riotjs-admin
function Promise(fn) {
    var self = riot.observable(this);
    var resolved = false;
    $.map(['done', 'fail', 'always'], function(name) {
        self[name] = function(arg) {
            return self[$.isFunction(arg) ? 'on' : 'trigger'](name, arg);
        };
    });
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
