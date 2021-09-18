import { Observable } from "./lib/riot";

// Console shim
(() => {
    const f = () => {};
    if (!console) {
        // @ts-ignore
        console = {
            log:f, info:f, warn:f, debug:f, error:f
        };
    }
})();

export const limitNumber = (num: number, min: number, max: number) => {
    return Math.min(max, Math.max(num, min));
};

export const epsilonEquals = (a: number, b: number) => {
    return Math.abs(a - b) < 0.00000001;
};

// Polyfill from MDN
const sign = (x: number) => {
    if (x === 0 || isNaN(x)) {
        return x;
    }
    return x > 0 ? 1 : -1;
};
if(typeof Math.sign === "undefined") {
    Math.sign = sign;
}

export const deprecationWarning = (name: string) => {
    console.warn("You are using a deprecated feature scheduled for removal: " + name);
};

export const createBoolPassthroughFunction = <T>(owner: T, obj: Observable<any>, objPropertyName: string) => {
    return (val?: boolean) => {
        if(typeof val !== "undefined") {
            obj[objPropertyName] = val ? true : false;
            obj.trigger("change:" + objPropertyName, obj[objPropertyName]);
            return owner;
        } else {
            return obj[objPropertyName];
        }
    };
};

export const distanceNeededToAchieveSpeed = (currentSpeed: number, targetSpeed: number, acceleration: number) => {
    // v² = u² + 2a * d
    const requiredDistance = (Math.pow(targetSpeed, 2) - Math.pow(currentSpeed, 2)) / (2 * acceleration);
    return requiredDistance;
};
export const accelerationNeededToAchieveChangeDistance = (currentSpeed: number, targetSpeed: number, distance: number) => {
    // v² = u² + 2a * d
    const requiredAcceleration = 0.5 * ((Math.pow(targetSpeed, 2) - Math.pow(currentSpeed, 2)) / distance);
    return requiredAcceleration;
};

// Fake frame requester helper used for testing and fitness simulations
const createFrameRequester = (timeStep: number) => {
    let currentCb = (t: number) => {};
    let requester = {
        currentT: 0.0,
        register(cb: (t: number) => void) { currentCb = cb; },
        trigger(this: { currentT: number }) { this.currentT += timeStep; currentCb(this.currentT); }
    };
    return requester;
};

export interface CodeObj {
    init: (elevators: any[], floors: any[]) => void;
    update: (dt: number, elevators: any[], floors: any[]) => void;
}

export const getCodeObjFromCode = (code: string) => {
    if (code.trim().substr(0,1) === "{" && code.trim().substr(-1,1) === "}") {
        code = "(" + code + ")";
    }
    /* jslint evil:true */
    const obj: CodeObj = eval(code);
    /* jshint evil:false */
    if(typeof obj.init !== "function") {
        throw "Code must contain an init function";
    }
    if(typeof obj.update !== "function") {
        throw "Code must contain an update function";
    }
    return obj;
};
