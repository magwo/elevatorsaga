import Movable from './movable';
import { linearInterpolate } from './movable';
import { IFloor } from './floor';
import Elevator from './elevator';

export default class User extends Movable {
    weight: number;
    public spawnTimestamp: number = 0.0;
    currentFloor = 0;
    destinationFloor = 0;
    done = false;
    removeMe = false;
    public displayType: string = "female";
    exitAvailableHandler = (floorNum: number, elevator: Elevator) => {};

    constructor(weight: number) {
        super();
        this.weight = weight;
    }

    appearOnFloor(floor: IFloor, destinationFloorNum: number) {
        const floorPosY = floor.getSpawnPosY();
        this.currentFloor = floor.level;
        this.destinationFloor = destinationFloorNum;
        this.moveTo(null, floorPosY);
        this.pressFloorButton(floor);
    }

    pressFloorButton(floor: IFloor) {
        if(this.destinationFloor < this.currentFloor) {
            floor.pressDownButton();
        } else {
            floor.pressUpButton();
        }
    }

    handleExit(floorNum: number, elevator: Elevator) {
        if(elevator.currentFloor === this.destinationFloor) {
            elevator.userExiting(this);
            this.currentFloor = elevator.currentFloor;
            this.setParent(null);
            const destination = this.x + 100;
            this.done = true;
            this.trigger("exited_elevator", elevator);
            this.trigger("new_state");
            this.trigger("new_display_state");
            const self = this;
            this.moveToOverTime(destination, null, 1 + Math.random()*0.5, linearInterpolate, () => {
                self.removeMe = true;
                self.trigger("removed");
                self.off("*");
            });

            elevator.off("exit_available", this.exitAvailableHandler);
        }
    }

    elevatorAvailable(elevator: Elevator, floor: IFloor) {
        if(this.done || this.parent !== null || this.isBusy()) {
            return;
        }

        if(!elevator.isSuitableForTravelBetween(this.currentFloor, this.destinationFloor)) {
            // Not suitable for travel - don't use this elevator
            return;
        }

        const pos = elevator.userEntering(this);
        if(pos) {
            // Success
            this.setParent(elevator);
            this.trigger("entered_elevator", elevator);
            const self = this;
            this.moveToOverTime(pos[0], pos[1], 1, undefined, () => {
                elevator.pressFloorButton(self.destinationFloor);
            });
            this.exitAvailableHandler = (floorNum: number, elevator: Elevator) => { self.handleExit(elevator.currentFloor, elevator); };
            elevator.on("exit_available", this.exitAvailableHandler);
        } else {
            this.pressFloorButton(floor);
        }
    }
}
