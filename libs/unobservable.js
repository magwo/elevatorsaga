(function(unobservable) { "use strict";

// Black magic stuff
function CustomArray(numPreallocated) {
    this.arr = new Array(numPreallocated);
    this.len = 0;
}
CustomArray.prototype.push = function(e) {
    this.arr[this.len++] = e;
};
CustomArray.prototype.removeAt = function(index) {
    for(var j=index+1; j<this.len; j++) {
        this.arr[j-1] = this.arr[j];
    }
    // Potential memory leak right here, last element does not get nulled out as it should? Or?
    this.len--;
}

unobservable.observable = function(obj, options) {
    options = options || {};
    options.numPreallocatedHandlers = options.numPreallocatedHandlers || 0;
    options.addDataMembers = (typeof options.addDataMembers !== "undefined") ? options.addDataMembers : true;
    if(options.addDataMembers) {
        obj.callbacks = {};
    }

    obj.on = function(events, fn) {
        // This function is convoluted because we would like to avoid using split or regex, both which cause an array allocation
        var count = 0;
        for(var i=0, len=events.length; i<len; ++i) {
            var name = "";
            var i2 = events.indexOf(" ", i);
            if(i2 < 0) {
                if(i < events.length) {
                    name = events.slice(i);
                    count++;
                }
                i = len;
            }
            else if(i2-i > 1) {
                var name = events.slice(i, i2);
                count++;
                i = i2;
            }
            if(name.length > 0) {
                (this.callbacks[name] = this.callbacks[name] || new CustomArray()).push(fn);
            }
        }
        fn.typed = count > 1;
    };

    obj.off = function(events, fn) {
        if (events === "*") this.callbacks = {};
        else if (fn) {
            var fns = this.callbacks[events];
            for (var i = 0, len=fns.len; i<len; ++i) {
                var cb = fns.arr[i];
                if(cb === fn) { fns.removeAt(i); }
            }
        } else {
            var count = 0;
            for(var i=0, len=events.length; i<len; ++i) {
                var name = "";
                var i2 = events.indexOf(" ", i);
                if(i2 < 0) {
                    if(i < events.length) {
                        name = events.slice(i);
                    }
                    i = len;
                }
                else if(i2-i > 1) {
                    var name = events.slice(i, i2);
                    i = i2;
                }
                if(name.length > 0) {
                    this.callbacks[name] = undefined;
                }
            }
        }
        return this;
    };

    // Only single event supported
    obj.one = function(name, fn) {
        fn.one = true;
        return this.on(name, fn);
    };

    obj.trigger = function(name, arg1, arg2, arg3, arg4) {
        // Just using bogus args is much faster than manipulating the arguments array
        var fns = this.callbacks[name];
        if(!fns) { return this; }

        for (var i=0; i<fns.len; i++) { // Note: len can change during iteration
            var fn = fns.arr[i];
            if(fn.typed) { fn.call(this, name, arg1, arg2, arg3, arg4); }
            else { fn.call(this, arg1, arg2, arg3, arg4); }
            if (fn.one) { fns.removeAt(i, 1); fn.one = false; i--; }
            else if(fns.arr[i] && fns.arr[i] !== fn) { i-- } // Makes self-removal possible during iteration
        }
        return this;
    };
    return obj;
};

unobservable.Observable = function() {
    this.callbacks = {};
};
unobservable.observable(unobservable.Observable.prototype, {numPreallocatedHandlers: 2, addDataMembers: false});
unobservable.asObservable = unobservable.observable;
unobservable.CustomArray = CustomArray; // Expose for testability
})((typeof window !== "undefined" ? window.unobservable = {} : (typeof exports !== "undefined" ? exports : self.unobservable = {})));