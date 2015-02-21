{
    name: 'kballenegger\'s solution',
    url: 'https://gist.github.com/kballenegger/e275a99d50de2ee07f97',
    init: function(elevators, floors) {
        var idleElevators = [];
        
        var upsRequested   = [];
        var downsRequested = [];
        
        var goAndSetIndicator = function (elevator, num, index) {
            console.log('k: figure out where to go next');
 
            // add num to queue, then uniq and without
            elevator.destinationQueue.push(num);
            elevator.destinationQueue = _.uniq(elevator.destinationQueue, true);
            elevator.destinationQueue = _.without(elevator.destinationQueue, elevator.currentFloor());
 
            // group queue
            var grouped = _.groupBy(elevator.destinationQueue, function (destination) {
                return destination > elevator.currentFloor() ? 'up' : 'down';
            });
            
            // set default values
            if (!grouped.up)   { grouped.up   = []; }
            if (!grouped.down) { grouped.down = []; }
            
            // sort
            grouped.up   = _.sortBy(grouped.up,   function (x) { return  1 * x; });
            grouped.down = _.sortBy(grouped.down, function (x) { return -1 * x; });
            
            // figure out direction we're headed
            var now = 'down', later = 'up';
            if (elevator.goingUpIndicator() == true) {
                var now = 'up', later = 'down';
                elevator.goingDownIndicator(false); // just in case?
            } else if (elevator.goingDownIndicator() == true) {
                // do nothing, everything's good
            } else {
                // go down, and set the indicator
                elevator.goingDownIndicator(true);
            }
            
            // check for pivots
            if (grouped[now].length == 0) {
                if (elevator.goingUpIndicator() == true) {
                    elevator.goingUpIndicator(false);
                    elevator.goingDownIndicator(true);
                } else if (elevator.goingDownIndicator() == true) {
                    elevator.goingUpIndicator(true);
                    elevator.goingDownIndicator(false);
                }
            }
            
            // TODO: merge with requests
            
            elevator.destinationQueue = grouped[now].concat(grouped[later]);
            elevator.checkDestinationQueue();
            console.log('k: [' + index + '] destination queue updated: ' + elevator.destinationQueue);
        }
        
        var idleElevatorFulfillRequests = function (elevator, index) {
            var upFirst   = Math.random() > 0.5;
            var direction;
            
            if (upsRequested.length == 0 && downsRequested.length == 0) { return false; }
            
            if (upFirst) {
                if (upsRequested.length > 0) { // set elevator to handle all requests
                    elevator.destinationQueue = upsRequested;
                    upsRequested = [];
                    direction = 'up';
                } else {
                    elevator.destinationQueue = downsRequested;
                    downsRequested = [];
                    direction = 'down';
                };
 
            } else {
                if (downsRequested.length > 0) {
                    elevator.destinationQueue = downsRequested;
                    downsRequested = [];
                    direction = 'down';
                } else {
                    elevator.destinationQueue = upsRequested;
                    upsRequested = [];
                    direction = 'up';
                };
            }
            
            if (direction == 'up') {
                elevator.goingUpIndicator(true);
                elevator.goingDownIndicator(false);
            } else if (direction == 'down') {
                elevator.goingUpIndicator(false);
                elevator.goingDownIndicator(true);
            }
            elevator.destinationQueue = _.uniq(elevator.destinationQueue, true);
            elevator.checkDestinationQueue();
            console.log('k: idle elevator ' + index + ' sent to handle all requests ' + direction + ' - ' + elevator.destinationQueue);
            return true;
        };
        
        var handleRequest = function(num, direction) {
            if (idleElevators.length > 0) {
                console.log('k: idle elevator sent to floor ' + num);
                idleElevators.shift().goToFloor(num);
            } else {
                console.log('k: floor request queued: ' + num);
                (direction == 'up' ? upsRequested : downsRequested).push(num);
 
                // re-sort
                upsRequested   = _.sortBy(upsRequested,   function (x) { return  1 * x; });
                downsRequested = _.sortBy(downsRequested, function (x) { return -1 * x; });
            }
            console.log(upsRequested, downsRequested);
        };
 
        
        _.each(elevators, function(elevator, index) {
            elevator.on("idle", function() {
                if (idleElevatorFulfillRequests(elevator, index)) {
                } else {
                    console.log('k: elevator ' + index + ' marked as idle');
                    idleElevators.push(elevator);
                };
            });
            elevator.on("floor_button_pressed", function(num) {
                goAndSetIndicator(elevator, num, index);
            });
            elevator.on("stopped_at_floor", function(num) {
                console.log('k: elevator ' + index + ' stopped at floor ' + num);
            });
        });
 
        _.each(floors, function(floor) {
            var num = floor.floorNum();
            floor.on("up_button_pressed", function() {
                handleRequest(num, 'up');
            });
            floor.on("down_button_pressed", function() {
                handleRequest(num, 'down');
            });
        });
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}