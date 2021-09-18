import { riot, Observable } from './lib/riot';
import * as _ from 'lodash';
import { createBoolPassthroughFunction, limitNumber, epsilonEquals } from './base';
import Elevator from './elevator';

export const enum ElevatorDirection {
    up = "up",
    down = "down",
    stopped = "stopped"
}

interface IElevator {
    goToFloor(floorNum: number, forceNow?: boolean): void;
    stop(): void;
    currentFloor(): number;
    goingUpIndicator(val: boolean): boolean | this;
    goingDownIndicator(val: boolean): boolean | this;
    maxPassengerCount(): number;
    loadFactor(): number;
    destinationDirection(): ElevatorDirection;
    destinationQueue: number[];
    checkDestinationQueue(): void;
    getFirstPressedFloor(): number;
    getPressedFloors(): number[];
}

export type ElevatorInterface<T> = Observable<T> & IElevator;

// Interface that hides actual elevator object behind a more robust facade,
// while also exposing relevant events, and providing some helper queue
// functions that allow programming without async logic.
export const asElevatorInterface = <T>(obj: T, elevator: Elevator, floorCount: number, errorHandler: (e: any) => void): ElevatorInterface<T> => {
    let elevatorInterface = riot.observable(obj) as Observable<T> & IElevator;

    elevatorInterface.destinationQueue = [];

    const tryTrigger = (event: string, ...args: any[]) => {
        try {
            elevatorInterface.trigger(event, ...args);
        } catch(e) { errorHandler(e); }
    };

    elevatorInterface.checkDestinationQueue = () => {
        if(!elevator.isBusy()) {
            if(elevatorInterface.destinationQueue.length > 0) {
                elevator.goToFloor(_.first(elevatorInterface.destinationQueue)!);
            } else {
                tryTrigger("idle");
            }
        }
    };

    // TODO: Write tests for this queueing logic
    elevatorInterface.goToFloor = (floorNum: number, forceNow?: boolean) => {
        floorNum = limitNumber(Number(floorNum), 0, floorCount - 1);
        // Auto-prevent immediately duplicate destinations
        if(elevatorInterface.destinationQueue.length > 0) {
            const adjacentElement = forceNow ? _.first(elevatorInterface.destinationQueue) : _.last(elevatorInterface.destinationQueue);
            if(epsilonEquals(floorNum, adjacentElement!)) {
                return;
            }
        }
        elevatorInterface.destinationQueue[(forceNow ? "unshift" : "push")](floorNum);
        elevatorInterface.checkDestinationQueue();
    };

    elevatorInterface.stop = () => {
        elevatorInterface.destinationQueue = [];
        if(!elevator.isBusy()) {
            elevator.goToFloor(elevator.getExactFutureFloorIfStopped());
        }
    };

    elevatorInterface.getFirstPressedFloor = () => elevator.getFirstPressedFloor(); // Undocumented and deprecated, will be removed
    elevatorInterface.getPressedFloors = () => elevator.getPressedFloors();
    elevatorInterface.currentFloor = () => elevator.currentFloor;
    elevatorInterface.maxPassengerCount = () => elevator.maxUsers;
    elevatorInterface.loadFactor = () => elevator.getLoadFactor();
    elevatorInterface.destinationDirection = () => {
        if(elevator.destinationY === elevator.y) { return ElevatorDirection.stopped; }
        return elevator.destinationY > elevator.y ? ElevatorDirection.down : ElevatorDirection.up
    }
    elevatorInterface.goingUpIndicator = createBoolPassthroughFunction(elevatorInterface, elevator, "goingUpIndicator");
    elevatorInterface.goingDownIndicator = createBoolPassthroughFunction(elevatorInterface, elevator, "goingDownIndicator");

    elevator.on("stopped", (position: number) => {
        if(elevatorInterface.destinationQueue.length > 0 && epsilonEquals(_.first(elevatorInterface.destinationQueue)!, position)) {
            // Reached the destination, so remove element at front of queue
            elevatorInterface.destinationQueue = _.drop(elevatorInterface.destinationQueue);
            if(elevator.isOnAFloor()) {
                elevator.wait(1, () => {
                    elevatorInterface.checkDestinationQueue();
                });
            } else {
                elevatorInterface.checkDestinationQueue();
            }
        }
    });

    elevator.on("passing_floor", (floorNum: number, direction: ElevatorDirection) => {
        tryTrigger("passing_floor", floorNum, direction);
    });

    elevator.on("stopped_at_floor", (floorNum: number) => {
        tryTrigger("stopped_at_floor", floorNum);
    });
    elevator.on("floor_button_pressed", (floorNum: number) => {
        tryTrigger("floor_button_pressed", floorNum);
    });

    return elevatorInterface;
};
