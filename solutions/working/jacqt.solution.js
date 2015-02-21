{ 
    name: 'Jacqt and Dvdhsu; for level 17. Basic solution that works surprisignly well on problem 17. Elevators go from 0 to 20 to 0 to 20 repeatedly',
    url: 'https://github.com/jacqt/elevatorbot',
    init: function(elevators, floors) {
        var i = 0;
        elevators.map(function(elevator){
            var prevLoadFactor = 0;
            var j = 0;
            if (i == 0){
                elevator.goToFloor(20);
                var MINLOAD = 0.0;
            } else if (i == 1){
                var MINLOAD = 0.0
                elevator.goToFloor(20);
            } else if (i == 2){
                var MINLOAD = 0.4
                elevator.goToFloor(10);
            } else {
                var MINLOAD = 0.6;
                elevator.goToFloor(0);

            }
            i++;
            elevator.on("passing_floor", function(floorNum){
                if (elevator.loadFactor() > 0.7){
                    if (elevator.getPressedFloors().indexOf(0) > -1 && elevator.getPressedFloors().length == 1){
                        elevator.goToFloor(0, true);
                        return;
                    }
                }
                var floor = floors[floorNum];
                if ((floor.HELP) && elevator.loadFactor() < 0.6){
                    floor.HELP =false;
                    if (this.destinationQueue[0] != floor.floorNum()){
                        this.goToFloor(floorNum, true);
                    }
                } else {
                    if (elevator.getPressedFloors().indexOf(floorNum) > -1){
                        floor.HELP = false;
                        this.goToFloor(floorNum, true);
                    }
                }
               
            });
            elevator.on('stopped_at_floor', function(){

            });
            elevator.on('floor_button_pressed', function(){
                if (elevator.currentFloor() == 0){
                    if (elevator.loadFactor() > MINLOAD){
                        elevator.goToFloor(20);
                    }
                }
            });
            elevator.on("idle", function(){
                if (elevator.currentFloor() == 0 ){
                    if (elevator.loadFactor() < MINLOAD){
                        return;
                    }
                }
                elevator.goToFloor(j);
                if (j == 20){
                    j = 0;
                } else {
                    j = 20;
                }
            });
        });

        floors.map(function(floor){
            floor.on('up_button_pressed', function(){
                floor.HELP = true;
            });
            floor.on('down_button_pressed', function(){
                floor.HELP = true;
            });
        })
        
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}