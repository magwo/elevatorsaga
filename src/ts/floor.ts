import { riot, Observable } from './lib/riot';
import Elevator from './elevator';

export interface IFloor {
    level: number;
    yPosition: number;
    buttonStates: { up: string, down: string };
    pressUpButton(): void;
    pressDownButton(): void;
    elevatorAvailable(elevator: Elevator): void;
    getSpawnPosY(): number;
    floorNum(): number;
}

export type Floor<T> = Observable<T> & IFloor;

export const asFloor = <T>(obj: T, floorLevel: number, yPosition: number, errorHandler: (e: any) => void) => {
    let floor = riot.observable(obj) as Floor<T>;

    floor.level = floorLevel;
    floor.yPosition = yPosition;
    floor.buttonStates = {up: "", down: ""};

    // TODO: Ideally the floor should have a facade where tryTrigger is done
    const tryTrigger = (event: string, ...args: any[]) => {
        try {
            floor.trigger(event, ...args);
        } catch(e) { errorHandler(e); }
    };

    floor.pressUpButton = () => {
        var prev = floor.buttonStates.up;
        floor.buttonStates.up = "activated";
        if(prev !== floor.buttonStates.up) {
            tryTrigger("buttonstate_change", floor.buttonStates);
            tryTrigger("up_button_pressed", floor);
        }
    };

    floor.pressDownButton = () => {
        var prev = floor.buttonStates.down;
        floor.buttonStates.down = "activated";
        if(prev !== floor.buttonStates.down) {
            tryTrigger("buttonstate_change", floor.buttonStates);
            tryTrigger("down_button_pressed", floor);
        }
    };

    floor.elevatorAvailable = (elevator) => {
        if(elevator.goingUpIndicator && floor.buttonStates.up) {
            floor.buttonStates.up = "";
            tryTrigger("buttonstate_change", floor.buttonStates);
        }
        if(elevator.goingDownIndicator && floor.buttonStates.down) {
            floor.buttonStates.down = "";
            tryTrigger("buttonstate_change", floor.buttonStates);
        }
    };

    floor.getSpawnPosY = () => {
        return floor.yPosition + 30;
    };

    floor.floorNum = () => {
        return floor.level;
    };

    return floor;
};
