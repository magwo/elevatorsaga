"use strict";

// Black magic stuff
export class CustomArray<T> {
    public arr: T[];
    public len: number;

    constructor(numPreallocated?: number) {
        this.arr = new Array(numPreallocated);
        this.len = 0;
    }

    push(e: T) {
        this.arr[this.len++] = e;
    }

    removeAt(index: number) {
        for(let j = index + 1; j < this.len; j++) {
            this.arr[j-1] = this.arr[j];
        }
        // Potential memory leak right here, last element does not get nulled out as it should? Or?
        this.len--;
    }
}

export class Observable {
    protected callbacks: { [key: string]: any } = {};

    on(events: string, fn: any) {
        // This function is convoluted because we would like to avoid using split or regex, both which cause an array allocation
        let count = 0;
        for(let i=0, len=events.length; i<len; ++i) {
            let name = "";
            let i2 = events.indexOf(" ", i);
            if(i2 < 0) {
                if(i < events.length) {
                    name = events.slice(i);
                    count++;
                }
                i = len;
            }
            else if(i2-i > 1) {
                let name = events.slice(i, i2);
                count++;
                i = i2;
            }
            if(name.length > 0) {
                (this.callbacks[name] = this.callbacks[name] || new CustomArray()).push(fn);
            }
        }
        fn.typed = count > 1;

        return this;
    }

    off(events: string, fn?: any) {
        if (events === "*") this.callbacks = {};
        else if (fn) {
            let fns = this.callbacks[events];
            for (let i = 0, len=fns.len; i<len; ++i) {
                let cb = fns.arr[i];
                if(cb === fn) { fns.removeAt(i); }
            }
        } else {
            let count = 0;
            for(let i=0, len=events.length; i<len; ++i) {
                let name = "";
                let i2 = events.indexOf(" ", i);
                if(i2 < 0) {
                    if(i < events.length) {
                        name = events.slice(i);
                    }
                    i = len;
                }
                else if(i2-i > 1) {
                    let name = events.slice(i, i2);
                    i = i2;
                }
                if(name.length > 0) {
                    this.callbacks[name] = undefined;
                }
            }
        }
        return this;
    }

    // Only single event supported
    one(name: string, fn: any) {
        fn.one = true;
        return this.on(name, fn);
    }

    trigger(name: string, ...args: any[]) {
        // Just using bogus args is much faster than manipulating the arguments array
        let fns = this.callbacks[name];
        if(!fns) { return this; }

        for (let i = 0; i < fns.len; ++i) { // Note: len can change during iteration
            let fn = fns.arr[i];
            if(fn.typed) { fn.call(this, name, ...args); }
            else { fn.call(this, ...args); }
            if (fn.one) { fns.removeAt(i, 1); fn.one = false; i--; }
            else if(fns.arr[i] && fns.arr[i] !== fn) { i-- } // Makes self-removal possible during iteration
        }
        return this;
    }
}
