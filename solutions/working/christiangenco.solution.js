{
    name: 'Hacky solution to every "N-elevator moves or less" level (v 0.1)',
    url: 'https://github.com/magwo/elevatorsaga/wiki/Christian-Genco%27s-hacky-solution-to-every-%22N-elevator-moves-or-less%22-level',
    init: function(elevators, floors) {
        // first, wait ten seconds for the queues to fill up on each floor
        setTimeout(function(){
            // use only the first elevator
            var e = elevators[0];

            // ...and open up its doors on the ground floor
            e.goToFloor(0);

            var direction = 1;
            e.on('idle', function(){
                // are we on the top floor? go down
                if(e.currentFloor() >= floors.length - 1) direction = -1;

                // are we on the ground floor? go up next time
                if(e.currentFloor() <= 0) direction = 1;

                // go to the next floor!
                e.goToFloor(e.currentFloor() + direction);
            });
        }, 10000);
    },
    update: function(dt, elevators, floors) {}
}