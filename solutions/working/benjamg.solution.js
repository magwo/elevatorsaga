{
    name: 'benjamg\'s solution for 1 to 16',
    url: 'https://github.com/magwo/elevatorsaga/wiki/All-puzzle-solution-by-@benjamg-%28struggles-with-2,-5-and-16%29',
    init: function(elevators, floors) {
        var LIFT_MAX_PERSON = 4;
        var LIFT_CONSIDER_FULL = 0.7;
        var GROUND_FLOOR_WEIGHT = 0.3;

        var minimum_wait_challenges = [8, 9, 10, 11, 12, 13, 14, 15, 16];
        var move_or_less_challenges = [6, 7];
        var challenge = parseInt(document.URL.substr(document.URL.lastIndexOf("=")+1));
        var wait_mode = move_or_less_challenges.indexOf( challenge ) != -1;
        var short_mode = minimum_wait_challenges.indexOf( challenge ) != -1;

        var requests = [];

        var requestElevator = function( floorNum, direction ) {
            var distance = floors.length;
            var nearest = -1;

            for( i = 0; i < elevators.length; ++i )
            {
                if( elevators[i].fast
                   || ("idle" != elevators[i].direction && direction != elevators[i].direction)
                   || LIFT_CONSIDER_FULL < elevators[i].loadFactor() ) { continue; }

                var current = elevators[i].currentFloor();

                if( ( "idle" == elevators[i].direction
                           || (("up" == direction && floorNum > current)
                           || ("down" == direction && floorNum < current)) ) 
                        && Math.abs( floorNum - current ) < distance ) {
                    distance = Math.abs( floorNum - current );
                    nearest = i;
                }
            }

            if( (distance == 0 || !wait_mode) && nearest != -1 ) {
                elevators[nearest].injectFloor( floorNum, direction );
            }
            else {
                requests.push({ floor:floorNum, direction:direction });
            }
        };

        for( i = 0; i < floors.length; ++i )
        {
            floors[i].on("up_button_pressed", function() {
                requestElevator( this.floorNum(), "up" );
            });
            floors[i].on("down_button_pressed", function() {
                requestElevator( this.floorNum(), "down" );
            });
        }
        for( i = 0; i < elevators.length; ++i )
        {
            elevators[i].pendingQueue = [];
            elevators[i].fast = false;
            elevators[i].direction = "idle";

            elevators[i].injectFloor = function( floorNum, direction ) {
                if( 0 == this.destinationQueue.length ) {
                    var travel = (floorNum == this.currentFloor()) ? "idle" : ((floorNum < this.currentFloor()) ? "down" : "up");

                    if( "idle" == direction ) { direction = travel; }
                    if( travel != direction && floorNum != 0 && floorNum != floors.length - 1 ) { this.fast = true; }

                    this.direction = direction;
                    if( !wait_mode ) {
                        this.goingUpIndicator( "up" == this.direction || "idle" == this.direction );
                        this.goingDownIndicator( "down" == this.direction || "idle" == this.direction );
                    }

                    this.goToFloor( floorNum );
                    return;
                }

                for( i = 0; i < this.destinationQueue.length; ++i ) {
                    if( floorNum == this.destinationQueue[i] ) { return; } // no change
                    if(("up"==this.direction && floorNum<this.destinationQueue[i]) || ("down"==this.direction && floorNum>this.destinationQueue[i])){
                        this.destinationQueue.splice( i, 0, floorNum );
                        this.checkDestinationQueue();
                        return;
                    }
                }

                this.goToFloor( floorNum );
            };
            elevators[i].on("idle", function( floorNum ) {
                this.direction = "idle";
                this.goingUpIndicator(true);
                this.goingDownIndicator(true);

                if( wait_mode ) {
                    this.goToFloor( this.currentFloor() );
                }
                else if( short_mode && requests.length ) {
                    var target = requests.shift();
                    this.injectFloor( target.floor, target.direction );
                }
                else if( requests.length ) {
                    var distance = floors.length;
                    var index = 0;

                    for( i = 0; i < requests.length; ++i ) {
                        var d = Math.abs(this.currentFloor() - requests[i].floor);
                        if( requests[i].floor == 0 && d > 0 ) { d = Math.max( 1, d - Math.floor(floors.length * GROUND_FLOOR_WEIGHT) ) };

                        if( d < distance ) {
                            distance = d;
                            index = i;
                        }
                    }

                    this.injectFloor( requests[index].floor, requests[index].direction );
                    requests.splice( index, 1 );
                }
            });
            elevators[i].on("floor_button_pressed", function( floorNum ) {
                if( wait_mode ) { 
                    this.pendingQueue.push( floorNum );
                    if( this.pendingQueue.length < LIFT_MAX_PERSON ) { return; }

                    var counts = [];
                    var best = 0;

                    // The next block of code finds the most popular floor among our cargo
                    for( i = 0; i < this.pendingQueue.length; ++i ) {
                        floorNum = this.pendingQueue[i];
                        counts[floorNum] = (typeof counts[floorNum] !== 'undefined') ? counts[floorNum] + 1 : 1;
                    }
                    for( i = 0; i < counts.length; ++i ) {
                        if( typeof counts[i] !== 'undefined' && counts[i] > best ) {
                            best = counts[i];
                            floorNum = i;
                        }                            
                    }
                    for( i = 0; i < this.pendingQueue.length; ++i )
                    {
                        if( this.pendingQueue[i] == floorNum ) {
                            this.pendingQueue.splice( i, 1 );
                            --i;
                        }
                    }
                }

                this.injectFloor( floorNum, "idle" );
            });
            elevators[i].on("passing_floor", function( floorNum, direction ) {
                if( wait_mode || this.fast || LIFT_CONSIDER_FULL < this.loadFactor() ) { return; }

                for( i = 0; i < requests.length; ++i ) {
                    if( requests.floor == floorNum && requests.direction == direction ) {
                        this.goToFloor( requests[i].floor, true );
                        requests.splice( i, 1 );
                        break;
                    }
                }
            });
            elevators[i].on("stopped_at_floor", function( floorNum ) {
                this.fast = false;
            });
        }

    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}