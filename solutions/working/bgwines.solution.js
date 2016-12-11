/**
 * Notes
 * =====
 *
 * The `function() {...})(` hack
 * -----------------------------
 * Elevator Saga calls `eval` on the code supplied to it, first placing
 * () around the given code. In order to be able to reference functions
 * defined inside `init` from `update`, we need `that` to be defined at
 * the outer level. Credit to Tom McLaughlin for the idea for this
 * workaround :)
 *
 * Implementation invariants
 * -------------------------
 *
 * - cycling of queues happens only when the elevator stops or if it
 *      had all empty queues and receives a request
 * - only one direction light is on at a time
 *
 */

(function() {
    var that = this;
    var obj = {
        name: 'O(log(n))-competitive solution',
        url: 'https://github.com/bgwines/elevator-saga',
        init: function(elevators, floors) {
            /**
             * PASS constants
             */
            that.CURR_PASS = 0;
            that.NEXT_PASS = 1;
            that.NEXT_NEXT_PASS = 2;

            /**
             * Request types
             */
            that.PICK_UP = "PICK_UP";
            that.DROP_OFF = "DROP_OFF";

            /**
             * DIRECTION constants
             */
            that.UP = "UP";
            that.DOWN = "DOWN";

            /**
             * FLOOR BUTTON constants
             */
            that.NO_REQUEST = ""

            /**
             * An class that represents a request for an elevator.
             *
             * @param floorNum :: Integer
             * @param requestType :: Request type constant
             * @param direction :: direction constant
             */
            that.RequestFactory = function(floorNum, requestType, direction) {
                var that = {};

                that.floorNum = floorNum;

                that.requestType = requestType;

                that.direction = direction;

                that.equals = function(other) {
                    return (that.floorNum === other.floorNum)
                        && (that.requestType === other.requestType)
                        && (that.direction === other.direction);
                }

                return that;
            }

            /**
             * An class that represents how serviceable
             * an elevator request (up / down pressed) is.
             *
             * @param pass :: PASS constant - the index of the earliest
             *                       pass the elevator in question could
             *                       handle the request. 0-indexed, so 0
             *                       means the elevator can get the
             *                       request on its current path.
             */
            that.ElevatorRequestServiceabilityFactory = function(pass) {
                var that = {};
                that.pass = pass;
                return that;
            }

            /**
             * elevator member functions
             */
            _.each(elevators, function(elevator) {
                elevator.printQueues = function() {
                    console.log('E' + elevator.uid + ' queues:');
                    console.log(
                        elevator.getQueueFloors(elevator.currQueue)
                    );
                    console.log(
                        elevator.getQueueFloors(elevator.nextQueue)
                    );
                    console.log(
                        elevator.getQueueFloors(elevator.nextNextQueue)
                    );
                }

                /**
                 * @return :: ElevatorRequestServiceability
                 */
                elevator.getRequestServiceability = function(request) {
                    if (elevator.floorIsOnCurrPass(request)) {
                        return that.ElevatorRequestServiceabilityFactory(
                            that.CURR_PASS
                        );
                    }

                    if (elevator.floorIsOnNextPass(request)) {
                        return that.ElevatorRequestServiceabilityFactory(
                            that.NEXT_PASS
                        );
                    }

                    if (elevator.floorIsOnNextNextPass(request)) {
                        return that.ElevatorRequestServiceabilityFactory(
                            that.NEXT_NEXT_PASS
                        );
                    }
                }

                /**
                 * @return :: Bool
                 */
                elevator.floorIsOnCurrPass = function(request) {
                    // TODO: decomp
                    if (request.direction === that.UP) {
                        if (elevator.goingDownIndicator()) {
                            return false;
                        }

                        if (elevator.currentFloor() === request.floorNum) {
                            // currentFloor() is discretized, so this'll
                            // prevent the edge case of elevators turning
                            // back later
                            return elevator.getPressedFloors().length === 0;
                        } else { // going up
                            return elevator.currentFloor() < request.floorNum;
                        }
                    } else {
                        if (elevator.goingUpIndicator()) {
                            return false;
                        }

                        if (elevator.currentFloor() === request.floorNum) {
                            // currentFloor() is discretized, so this'll
                            // prevent the edge case of elevators turning
                            // back later
                            return elevator.getPressedFloors().length === 0;
                        } else { // going down
                            return elevator.currentFloor() > request.floorNum;
                        }
                    }
                }

                /**
                 * @return :: Bool
                 */
                elevator.floorIsOnNextPass = function(request) {
                    return (request.direction === that.UP)
                        ? elevator.goingDownIndicator()
                        : elevator.goingUpIndicator();
                }

                /**
                 * @return :: Bool
                 */
                elevator.floorIsOnNextNextPass = function(request) {
                    return request.direction === that.UP
                        ? elevator.goingUpIndicator()
                        : elevator.goingDownIndicator();
                }

                /**
                 * @param floorNum :: Integer
                 * @return :: Bool
                 */
                elevator.isIdleAtFloor = function(floorNum) {
                    return (elevator.getPressedFloors().length === 0)
                        && (elevator.currentFloor() === floorNum);
                }

                /**
                 * Gets the floors stored in a queue
                 */
                 elevator.getQueueFloors = function(queue) {
                    return _.map(queue, function(request) {
                        return request.floorNum;
                    });
                 }

                /**
                 * @param request :: Request
                 *
                 * inserts the floor as as a destination for the elevator
                 * on the current pass
                 */
                elevator.insertDestinationOnCurrPass = function(request) {
                    if (elevator.isIdleAtFloor(request.floorNum)) {
                        return; // Already there
                    }

                    elevator.currQueue.push(request);
                    elevator.sortQueues();
                    elevator.destinationQueue = elevator.getQueueFloors(
                        elevator.currQueue
                    );
                    elevator.checkDestinationQueue();
                };

                /**
                 * @param request :: Request
                 *
                 * inserts the floor as as a destination for the elevator
                 * on the next pass
                 */
                elevator.insertDestinationOnNextPass = function(request) {
                    elevator.nextQueue.push(request);
                    elevator.sortQueues();
                };

                /**
                 * @param request :: Request
                 *
                 * inserts the floor as as a destination for the elevator
                 * on the next next pass
                 */
                elevator.insertDestinationOnNextNextPass = function(request)
                {
                    elevator.nextNextQueue.push(request);
                    elevator.sortQueues();
                };

                /**
                 * @return :: Bool
                 */
                elevator.queuesAreAllEmpty = function() {
                    return (elevator.currQueue.length === 0)
                        && (elevator.nextQueue.length === 0)
                        && (elevator.nextNextQueue.length === 0);
                }

                /**
                 * @param request :: Request
                 *
                 * inserts the floor as as a destination for the elevator
                 * on as early a pass as possible
                 */
                elevator.insertDestination = function(request) {
                    serviceability = elevator.getRequestServiceability(
                        request
                    );
                    var queuesWereAllEmpty = elevator.queuesAreAllEmpty();
                    switch (serviceability.pass) {
                        case that.CURR_PASS:
                            elevator.insertDestinationOnCurrPass(request);
                            break;

                        case that.NEXT_PASS:
                            elevator.insertDestinationOnNextPass(request);
                            break;

                        case that.NEXT_NEXT_PASS:
                            elevator.insertDestinationOnNextNextPass(
                                request
                            );
                            break;
                    }
                    if (queuesWereAllEmpty) {
                        // insertion might not've happened in `currQueue`,
                        // which would mean we wouldn't go anywhere.
                        // Hence, we might need to cycle.
                        elevator.cycleQueuesIfPossible();
                    }
                }

                /**
                 * sorts all queues: curr, next, and next-next.
                 */
                elevator.sortQueues = function() {
                    this.increasingCmp = function(n1, n2)
                        { return n1.floorNum - n2.floorNum; }
                    this.decreasingCmp = function(n1, n2)
                        { return n2.floorNum - n1.floorNum; }

                    if (elevator.goingUpIndicator()) {
                        elevator.currQueue.sort(this.increasingCmp);
                        elevator.nextQueue.sort(this.decreasingCmp);
                        elevator.nextNextQueue.sort(this.increasingCmp);
                    } else {
                        elevator.currQueue.sort(this.decreasingCmp);
                        elevator.nextQueue.sort(this.increasingCmp);
                        elevator.nextNextQueue.sort(this.decreasingCmp);
                    }
                }

                /**
                 * Flips the elevator's direction indicator
                 */
                elevator.flipDirection = function() {
                    if (elevator.goingUpIndicator()) {
                        console.log('E' + elevator.uid + ' was (↑), now (↓)');
                    } else {
                        console.log('E' + elevator.uid + ' was (↓), now (↑)');
                    }

                    elevator.goingUpIndicator(
                        !elevator.goingUpIndicator()
                    );
                    elevator.goingDownIndicator(
                        !elevator.goingDownIndicator()
                    );
                }

                /**
                 * @return :: DIRECTION constant
                 */
                elevator.getCurrDirection = function() {
                    return elevator.goingUpIndicator()
                        ? that.UP
                        : that.DOWN;
                }

                /**
                 * let's say this elevator is going (WLOG) up and about
                 * to drop their only person off at F2. If nextQueue's
                 * first request to satisfy is a down request at
                 * Fk for k > 2, then we want to actually insert k
                 * in the current queue so that we go there while
                 * facing that direction. Note that this condition only
                 * makes sense if nextQueue is not the empty array and
                 * currQueue is the empty array.
                 *
                 * @return :: Bool - whether the insertion was performed.
                 */
                elevator._insertFirstOfNextIfAppropriate = function() {
                    if ((elevator.currQueue.length === 0) && 
                        (elevator.nextQueue.length !== 0)
                    ) {
                        // if we're (WLOG) going up, let's get the
                        // highest "down" request
                        var potentialNextDestination
                            = (elevator.goingUpIndicator())
                            ? _.max(elevator.nextQueue, function(request) { return request.floorNum; })
                            : _.min(elevator.nextQueue, function(request)
                                { return request.floorNum; });

                        var request = that.RequestFactory(
                            potentialNextDestination.floorNum,
                            potentialNextDestination.requestType,
                            elevator.getCurrDirection() // along curr pass
                        );
                        var serviceability = elevator.getRequestServiceability(
                            request
                        );
                        // don't update currQueue if we're currently
                        // stopped at this floor because it's redundant
                        // and that redundancy can break some things
                        // (e.g. stopping at a floor and being about to
                        // flip direction while picking somebody up there)
                        if ((serviceability.pass === that.CURR_PASS) &&
                            !elevator.isIdleAtFloor(request.floorNum)
                        ) {
                            elevator.currQueue.push(request);
                            return true;
                        }
                    }
                    return false;
                }

                /**
                 * Cycles the three queues and updates the sorting.
                 */
                elevator.cycleQueues = function() {
                    elevator.flipDirection();

                    elevator.currQueue = elevator.nextQueue;
                    elevator.nextQueue = elevator.nextNextQueue;
                    elevator.nextNextQueue = [];

                    // directions have flipped, so we should resort
                    // in the correct directions.
                    elevator.sortQueues();
                }

                /**
                 * TODO: this doc comment exposes implementation details
                 *
                 * If the current pass's queue is empty,
                 * cycle the queues so that we can start moving.
                 */
                elevator.cycleQueuesIfPossible = function() {
                    if (elevator.queuesAreAllEmpty() ||
                        (elevator.currQueue.length !== 0)
                    ) {
                        // no point in cycling
                        return;
                    }

                    // see doc comment for this function; it'll become
                    // clear why it's necessary to call it here
                    var currQueueUpdated = elevator._insertFirstOfNextIfAppropriate();
                    if (currQueueUpdated) {
                        elevator.destinationQueue = elevator.getQueueFloors(
                            elevator.currQueue
                        );
                        elevator.checkDestinationQueue();
                        // definitely don't do any cycling; currQueue
                        // will no longer be empty by definition of the
                        // function so we'd just overwrite that op if we
                        // continued to do stuff.
                        return;
                    }

                    elevator.cycleQueues();

                    if (elevator.currQueue.length === 0) {
                        // happens if the only nonempty queue at the start
                        // was nextNextQueue. If we don't do something
                        // here, the elevator'll get stuck because
                        // currQueue'll be empty. Note that we can say
                        // that after this op, currQueue will *not* be
                        // empty, since at the start of the function we
                        // guarantee that not all queues are empty.
                        elevator._insertFirstOfNextIfAppropriate();
                    }

                    elevator.destinationQueue = elevator.getQueueFloors(
                        elevator.currQueue
                    );
                    elevator.checkDestinationQueue();
                }

                /**
                 * @param request :: Request
                 * @return :: Bool
                 */
                elevator.requestIsQueued = function(request) {
                    var eq = function(r) { return r.equals(request); };
                    return _.any(elevator.currQueue, eq)
                        || _.any(elevator.nextQueue, eq)
                        || _.any(elevator.nextNextQueue, eq);
                }

                /**
                 * The current load factor of this elevator. Note that
                 * this use of the word "load" is different from the
                 * notion of the sum of the weights of everyone currently
                 * in the elevator. Instead, load factor is a notion
                 * closer to how busy the elevator is.
                 */
                elevator.getCurrLoad = function() {
                    var e = elevator;
                    return (5 * e.loadFactor()) +
                        (1 * _.uniq(e.getQueueFloors(e.currQueue))
                            .length) +
                        (2 * _.uniq(e.getQueueFloors(e.nextQueue))
                            .length) +
                        (3 * _.uniq(e.getQueueFloors(e.nextNextQueue))
                            .length);
                }

                /**
                 * The current load factor of this elevator. Note that
                 * this use of the word "load" is different from the
                 * notion of the sum of the weights of everyone currently
                 * in the elevator. Instead, load factor is a notion
                 * closer to how busy the elevator is.
                 */
                elevator.getLoadIncrease = function(request) {
                    serviceability = elevator.getRequestServiceability(
                        request
                    );
                    switch (serviceability.pass) {
                        case that.CURR_PASS: return 1;
                        case that.NEXT_PASS: return 2;
                        case that.NEXT_NEXT_PASS: return 3;
                    }
                }
            });

            /* ---- elevator initialization ---- */

            /**
             * All elevators start at floor 0, so
             * they start by indicating "up".
             */
            _.each(elevators, function(elevator) {
                elevator.goingUpIndicator(true);
                elevator.goingDownIndicator(false);
            });

            /**
             * for debugging logging purposes
             */
            for (var i=0; i<elevators.length; i++) {
                elevators[i].uid = i;
            }

            /**
             * need to be able to queue requests for
             * after an elevator changes directions
             */
            _.each(elevators, function(elevator) {
                elevator.currQueue = [];
                elevator.nextQueue = [];
                elevator.nextNextQueue = [];
            });

            /* ---- start of helper functions ---- */

            /**
             * @param request :: Request
             * @return :: Elevator
             */
            that.getBestElevatorForRequest = function(request) {
                return _.min(elevators, function(elevator) {
                    currLoad = elevator.getCurrLoad();
                    loadIncrease = elevator.getLoadIncrease(request);
                    a = 1.5; // optimal choice
                    delta = Math.pow(a, currLoad + loadIncrease) - Math.pow(a, currLoad);
                    return delta;
                })
            }

            /* ---- end of helper functions ---- */

            /**
             * elevator behavior
             */
            _.each(elevators, function(elevator) {
                elevator.on("floor_button_pressed", function(floorNum) {
                    // The person will only have gotten on if the
                    // indicator was pointing in the direction in which
                    // they are traveling. Hence, we can guarantee that
                    // their destination will be on the current pass.
                    console.log(
                        'Pressed: F' + floorNum +
                        ' inside E' + elevator.uid
                    );
                    elevator.printQueues();
                    elevator.insertDestinationOnCurrPass(
                        that.RequestFactory(
                            floorNum,
                            that.DROP_OFF,
                            null
                        )
                    );
                    console.log('---------');
                    elevator.printQueues();
                });

                elevator.on("stopped_at_floor", function(floorNum) {
                    console.log('stopped at F' + floorNum);
                    elevator.printQueues();

                    elevator.currQueue = _.filter(
                        elevator.currQueue,
                        function(request) {
                            return request.floorNum !== floorNum;
                        }
                    );
                    elevator.cycleQueuesIfPossible();
                    elevator.currQueue = _.filter(
                        elevator.currQueue,
                        function(request) {
                            return request.floorNum !== floorNum;
                        }
                    );
                    console.log('--------');
                    elevator.printQueues();
                });
            });

            /**
             * Assign the request to an elevator
             */
            that.queueRequest = function(request) {
                console.log('Request: F' + request.floorNum + '(↑)');
                var bestElevator = that.getBestElevatorForRequest(
                    request
                );
                console.log(
                    '↑ (F' + request.floorNum + '): assigned to E'
                    + bestElevator.uid + ' (@ F'
                    + bestElevator.currentFloor() + ')'
                );
                bestElevator.printQueues();
                bestElevator.insertDestination(request);
                console.log('---------');
                bestElevator.printQueues();
            }

            /**
             * floor behavior
             */
            _.each(floors, function(floor) {
                floor.on("up_button_pressed", function() {
                    request = that.RequestFactory(
                        floor.floorNum(),
                        that.PICK_UP,
                        that.UP
                    );
                    that.queueRequest(request);
                });

                floor.on("down_button_pressed", function() {
                    request = that.RequestFactory(
                        floor.floorNum(),
                        that.PICK_UP,
                        that.DOWN
                    );
                    that.queueRequest(request);
                });

                /**
                 * @return :: Bool
                 */
                floor.hasOpenRequests = function() {
                    return (floor.buttonStates.up !== that.NO_REQUEST)
                        || (floor.buttonStates.down !== that.NO_REQUEST);
                }

                /**
                 * @return :: [Request]
                 */
                floor.getOpenRequests = function() {
                    var openRequests = [];
                    if (floor.buttonStates.up !== that.NO_REQUEST) {
                        openRequests.push(
                            that.RequestFactory(
                                floor.floorNum(),
                                that.PICK_UP,
                                that.UP
                            )
                        );
                    }
                    if (floor.buttonStates.down !== that.NO_REQUEST) {
                        openRequests.push(
                            that.RequestFactory(
                                floor.floorNum(),
                                that.PICK_UP,
                                that.DOWN
                            )
                        );
                    }
                    return openRequests;
                }
            });
        },

        /**
         * Called regularly.
         */
        update: function(dt, elevators, floors) {
            _.each(floors, function(floor) {
                if (floor.hasOpenRequests()) {
                    _.each(floor.getOpenRequests(), function(request) {
                        var requestIsQueued = _.any(elevators, function(e)
                            { return e.requestIsQueued(request); }
                        );
                        if (!requestIsQueued) {
                            console.log(
                                'REQUEST WAS DROPPED; QUEUEING NOW: '
                                + request
                            );
                            that.queueRequest(request);
                        }
                    });
                }
            });
        }
    };
    return obj;
}())