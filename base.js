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
    self.result = null;
    $.map(['done', 'fail', 'always'], function(name) {
        self[name] = function(arg) {
            if($.isFunction(arg)) {
                self.one(name, arg);
                if(self.resolution === name || (self.resolution !== null && name === 'always')) {
                    self.trigger(name, self.result);
                }
            } else {
                if(name === 'always') {
                    throw new Error('Invalid argument for "always" function: ' + arg);
                }
                if(self.resolution !== null) {
                    throw new Error('Can not resolve promise - already resolved to ' + self.resolution)
                }
                self.resolution = name;
                self.result = arg;
                self.trigger(name, self.result).trigger('always', self.result);
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
