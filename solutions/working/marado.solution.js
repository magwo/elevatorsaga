{
    name: 'marado\'s solution for 1-12',
    url: 'https://github.com/marado/elevator-saga-solutions/',
    init: function(elevators, floors) {
        // helper global variables
        var lastElevatorUsed = 0;
        var powersaving = false;
        var lastCalls = [];

        // helper functions
        sendOneElevatorTo = function(floor) {
            var cargo = 1; var emptier = [0];
            // if there's already an elevator scheduled there, ditch this
            for (var e = 0; e < elevators.length; e++) {
                if (elevators[e].destinationQueue.indexOf(floor) != -1) {
                    lastCalls.push(floor);
                    return;
                }
                if (elevators[e].loadFactor() < cargo) {
                    cargo = elevators[e].loadFactor();
                    emptier = [e];
                } else if (elevators[e].loadFactor() == cargo) {
                    emptier.push(e);
                }
            }

            var result = 0;
            if (emptier.length == 1) { 
                result = emptier.pop(); 
            }
            else {
                // who has nothing better to do?
                var shortestQueue = 0; var qlength = 100;
                for (var p = 0; p < emptier.length; p++) {
                    var l = elevators[emptier[p]].destinationQueue.length;
                    if (l<qlength) {
                        l = qlength;
                        shortestQueue = p;
                    }
                }
                result=emptier[shortestQueue];
            }

            // emptier
            sendElevatorTo(elevators[result],floor);

        }

        sendElevatorTo = function(elevator, floor) {
            if (typeof(floor) == 'undefined') return;
            // if this elevator is already scheduled there, don't add to the queue
            if (elevator.destinationQueue.indexOf(floor) != -1) return;

                elevator.goToFloor(floor);
        }

        // elevator events
        var functioningElevators = elevators.length;
        if (powersaving) functioningElevators = 1;
        for (var e = 0; e < functioningElevators; e++) {
            var elevator = elevators[e];
            elevator.on("idle", function() {
                // TODO: we should send to where are people waiting
                sendElevatorTo(this,lastCalls.pop());
            });
            elevator.on("floor_button_pressed", function(floor) {
                sendElevatorTo(this,floor);
            });
            elevator.on("stopped_at_floor", function(floorNum) {
                // let's rethink our schedule
                var queue = this.destinationQueue;
                if (queue.length > 0) {
                    // TODO: this is where we do voodoo:
                    // this.stop(); // yeah, I'm drastic
                    // this.currentFloor();
                }
            });
        }

        // floor events
        for (var f = 0; f < floors.length; f++) {
            var floor = floors[f];
            floor.on("up_button_pressed down_button_pressed", function() {
                sendOneElevatorTo(this.floorNum());
            });
        }
    },

    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}