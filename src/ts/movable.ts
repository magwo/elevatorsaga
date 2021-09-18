import { Observable } from './lib/unobservable';

const EPSILON = 0.00001;

type Interpolator = (value0: number, value1: number, x: number) => number;

export const linearInterpolate = (value0: number, value1: number, x: number) => {
    return value0 + (value1 - value0) * x;
};
const powInterpolate = (value0: number, value1: number, x: number, a: number) => {
    return value0 + (value1 - value0) * Math.pow(x, a) / (Math.pow(x, a) + Math.pow(1-x, a));
};
const coolInterpolate = (value0: number, value1: number, x: number) => {
    return powInterpolate(value0, value1, x, 1.3);
};
const DEFAULT_INTERPOLATOR: Interpolator = coolInterpolate;

const _tmpPosStorage: [number, number] = [0,0];

export default class Movable extends Observable {
    x = 0.0;
    y = 0.0;
    parent: Movable | null = null;
    worldX = 0.0;
    worldY = 0.0;
    currentTask: ((dt: number) => void) | null = null;

    constructor() {
        super();

        this.trigger('new_state', this);
    }

    updateDisplayPosition(forceTrigger?: boolean) {
        this.getWorldPosition(_tmpPosStorage);
        var oldX = this.worldX;
        var oldY = this.worldY;
        this.worldX = _tmpPosStorage[0];
        this.worldY = _tmpPosStorage[1];
        if(oldX !== this.worldX || oldY !== this.worldY || forceTrigger === true) {
            this.trigger('new_display_state', this);
        }
    }

    moveTo(newX: number | null, newY: number | null) {
        if(newX !== null) { this.x = newX; }
        if(newY !== null) { this.y = newY; }
        this.trigger("new_state", this);
    }

    moveToFast(newX: number, newY: number) {
        this.x = newX;
        this.y = newY;
        this.trigger("new_state", this);
    }

    isBusy() {
        return this.currentTask !== null;
    };

    makeSureNotBusy() {
        if(this.isBusy()) {
            console.error("Attempt to use movable while it was busy", this);
            throw({message: "Object is busy - you should use callback", obj: this});
        }
    }

    wait(millis: number, cb?: () => void) {
        this.makeSureNotBusy();
        let timeSpent = 0.0;
        let self = this;
        self.currentTask = (dt: number) => {
            timeSpent += dt;
            if(timeSpent > millis) {
                self.currentTask = null;
                if(cb) { cb(); }
            }
        };
    }

    moveToOverTime(newX: number | null, newY: number | null, timeToSpend: number, interpolator?: Interpolator, cb?: () => void) {
        this.makeSureNotBusy();
        if(newX === null) { newX = this.x; }
        if(newY === null) { newY = this.y; }
        if(typeof interpolator === "undefined") { interpolator = DEFAULT_INTERPOLATOR; }
        let origX = this.x;
        let origY = this.y;
        let timeSpent = 0.0;
        let self = this;
        self.currentTask = (dt: number) => {
            timeSpent = Math.min(timeToSpend, timeSpent + dt);
            if(timeSpent === timeToSpend) { // Epsilon issues possibly?
                self.moveToFast(newX!, newY!);
                self.currentTask = null;
                if(cb) { cb(); }
            } else {
                let factor = timeSpent / timeToSpend;
                self.moveToFast(interpolator!(origX, newX!, factor), interpolator!(origY, newY!, factor));
            }
        };
    }

    update(dt: number) {
        if(this.currentTask !== null) {
            this.currentTask(dt);
        }
    }

    getWorldPosition(storage: [number, number]) {
        let resultX = this.x;
        let resultY = this.y;
        let currentParent = this.parent;
        while(currentParent !== null) {
            resultX += currentParent.x;
            resultY += currentParent.y;
            currentParent = currentParent.parent;
        }
        storage[0] = resultX;
        storage[1] = resultY;
    }

    setParent(movableParent: Movable | null) {
        let objWorld: [number, number] = [0,0];
        if(movableParent === null) {
            if(this.parent !== null) {
                this.getWorldPosition(objWorld);
                this.parent = null;
                this.moveToFast(objWorld[0], objWorld[1]);
            }
        } else {
            // Parent is being set a non-null movable
            this.getWorldPosition(objWorld);
            let parentWorld: [number, number] = [0,0];
            movableParent.getWorldPosition(parentWorld);
            this.parent = movableParent;
            this.moveToFast(objWorld[0] - parentWorld[0], objWorld[1] - parentWorld[1]);
        }
    }
}
