{
    name: 'Eric\'s Solution for levels 1-7',
    url: 'https://github.com/ericdorsey/elevatorsaga',
    init: function(elevators, floors) {
        var numberOfElevators = elevators.length;
        var numberOfFloors = floors.length;
        console.log(numberOfElevators);

        for (var i = 0; i < numberOfElevators; i++) {
            console.log("i is currently: " + i);
            console.log("Elevator: " + i);

            elevators[i].on("idle", function() {
                console.log("idle");
                console.log(this.loadFactor());

                for (var j = 0; j < numberOfFloors; j++) {
                    if (this.getPressedFloors().length > 0) {
                        this.goToFloor(this.getPressedFloors()[0])
                        console.log(this.getPressedFloors());
                    } else if (this.loadFactor() === 0) {
                        //} else if ((this.loadFactor() === 0) && (j !== 0)) {
                        //if (this.loadFactor() === 0){
                        this.goToFloor(0);
                        //break;
                    } else {
                        //this.goToFloor(this.getPressedFloors()[0])
                        this.goToFloor(j);
                    }
                }

            });
            elevators[i].on("floor_button_pressed", function(floorNum) {
                console.log("button pressed on " + i);

                if (this.loadFactor() === 0) {
                    this.GoToFloor(0);
                }

                if ((this.getPressedFloors().length > 0) && (this.loadFactor() >= .2)) {
                    if (this.loadFactor() === 0) {
                        this.goToFloor(0);
                    } else {
                        console.log(this.getPressedFloors())
                        this.goToFloor(this.getPressedFloors()[0]);
                    }
                    //elevator.goToFloor();
                }
            });


        }
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}