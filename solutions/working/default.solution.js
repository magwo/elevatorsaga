{
    name: 'default',
    url: 'http://play.elevatorsaga.com/',
    init: function(elevators, floors) {
        var elevator = elevators[0]; // Let's use the first elevator
        elevator.on("idle", function() {
            // The elevator is idle, so let's go to all the floors (or did we forget one?)
            elevator.goToFloor(0);
            elevator.goToFloor(1);
        });
    },
        update: function(dt, elevators, floors) {
            // We normally don't need to do anything here
        }
}