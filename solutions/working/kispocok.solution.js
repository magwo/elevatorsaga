{
    /*
    challenge=18

    Transported         430
    Elapsed time        299s
    Transported/s       1.44
    Avg waiting time    12.6s
    Max waiting time    34.0s
    Moves               2798

    Transported         2708
    Elapsed time        1817s
    Transported/s       1.49
    Avg waiting time    14.4s
    Max waiting time    45.8s
    Moves               15356
    */
    name: 'kisPocok\'s Solution for level 0-12; with Hungarian comments.',
    url: 'https://gist.github.com/kisPocok/50deb558c941552b04c8',
    init: function(elevators, floors) {
        floors.forEach(function(floor) {
            floor.on('up_button_pressed down_button_pressed', function() {
                passangerArrived(floor);
            });
        })
        elevators.forEach(function(lift, liftIndex) {
            lift.id = liftIndex;
            lift.on('floor_button_pressed', function(floorNum) {
                indicatorUp(lift, floorNum > lift.currentFloor());
                addStop(lift, floorNum);
            });
            lift.on('passing_floor', function(floorNum, direction) {
                if (direction == 'down') {
                    indicatorDown(lift, true);
                }
                if (direction == 'up') {
                    indicatorUp(lift, true);
                }
                stopOnExit(lift, parseInt(floorNum)); // itt még felfelé is mehet a lift!
                stopOnMove(lift, parseInt(floorNum), direction, floors); // itt fixen lefelé megy!
            });
            lift.on('stopped_at_floor', function(floorNum) {
                passangerLeave(floorNum);
                if (floorNum == 0) {
                    indicatorUp(lift, true);
                }
                if (floorNum == floors.length - 1) {
                    indicatorDown(lift, true);
                }
            });
            lift.on('idle', function() {
                resetIndicators(lift);
                var floorNum = getWaitingQueue(lift, lift.currentFloor());
                addStop(lift, floorNum);
                passangerLeave(floorNum); // ez itt csak megelőlegezés, de többi liftnek fontos!
            });
        });
        
        var floorWaitingQueue = [];
        
        /**
         * Utas megnyomta a gombot
         * BUG: Listába kerül, de miután unique lista, lehet hogy több vár már az adott szinten mint amennyit az adott lift el tud vinni!
         */
        var passangerArrived = function(floor) {
            var floorNum = floor.floorNum();
            var fwq = floorWaitingQueue.push(floorNum);
            
            console.log('Passanger arrived to', floorNum, 'Q:', fwq);
        }
        
        /**
         * Utas elhagyja az emeletet
         * BUG: lehet többen állnak az emeleten és csak 1 fér be a liftbe!
         */
        var passangerLeave = function(floorNum) {
            var index = floorWaitingQueue.indexOf(floorNum);
            if (index > -1) {
                floorWaitingQueue.splice(index, 1);
            }
            
            console.log('Passanger leave from', floorNum, 'Q:', floorWaitingQueue);
        }
        
        /**
         * Visszaad egy szintet ahol éppen várakoznak
         */
        var getWaitingQueue = function(lift, floorNum) {
            console.log('LIFT #' + lift.id, 'getWaitingQueue', floorWaitingQueue, floorWaitingQueue.length, floorNum)
            if (floorWaitingQueue.length < 1) {
                return floorNum;
            }
            console.log('LIFT #' + lift.id, 'getWaitingQueue', 'closest:', closest(floorNum, floorWaitingQueue))
            return closest(floorNum, floorWaitingQueue);
        }
 
        /**
         * Ellenőrzi, hogy van-e várakozó ember azon az emeleten (akiért nem indúlt még lift)
         */
        var floorHasPassanger = function(floorNum) {
            return floorWaitingQueue.indexOf(floorNum) > -1;
        }
        
        /**
         * Új emelet hozzáadása a lift queue-jához.
         */
        var addStop = function(lift, floorNum) {
            if (alreadyInQueue(lift, floorNum)) {
                console.log('LIFT #' + lift.id, 'Mar szerpel ez az allomas!', floorNum)
                return false;
            }
            
            lift.goToFloor(floorNum);
            console.log('LIFT #' + lift.id, 'Új állomás:', floorNum, 'Q:', lift.destinationQueue)
        }
        
        var addImportantStop = function(lift, floorNum) {
            removeStop(lift, floorNum); // ha már fel van véve kiszedjük
 
            lift.goToFloor(floorNum, true);
            console.log('LIFT #' + lift.id, 'Új FONTOS állomás:', floorNum, 'Q:', lift.destinationQueue)
        }
 
        /**
         * Kiszed egy megállót a lift állomásaiból
         */
        var removeStop = function(lift, floorNum) {
            var index = lift.destinationQueue.indexOf(floorNum);
            if (index > -1) {
                lift.destinationQueue.splice(index, 1);
                lift.checkDestinationQueue();
                console.log('LIFT #' + lift.id, 'Törölt állomás:', floorNum, 'Q:', lift.destinationQueue);
            }
        }
        
        /**
         * Megállítjuk a liftet, ha van kiszálló
         */
        var stopOnExit = function(lift, floorNum) {
            if (lift.destinationQueue.indexOf(floorNum) > -1) {
                console.log('LIFT #' + lift.id, 'stopOnExit! találtunk egy emeletet ahol érdemes lenne megállni!', floorNum)
                addImportantStop(lift, floorNum);
            }
        }
        
        /**
         * Megállítjuk a liftet, ha lefelé megyünk és van utas aki lefelé utazna és nincs tele a lift!
         */
        var stopOnMove = function(lift, floorNum, direction, floors) {
            var floor = floors[floorNum];
            if ((direction == 'down' && floor.buttonStates.down == 'activated') || (direction == 'up' && floor.buttonStates.up == 'activated') || floorHasPassanger(floorNum)) {
                if (lift.loadFactor() < 0.6) {
                    // nincs tele (ez csak becslés!)
                    console.log('LIFT #' + lift.id, 'stopOnMove - megállunk mert menne erre utas!', 'Load:', lift.loadFactor())
                    addImportantStop(lift, floorNum);
                } else {
                    // tele van a lift
                    console.log('LIFT #' + lift.id, 'stopOnMove - megállnánk de tele vagyunk!', 'Load:', lift.loadFactor())
                    return false;
                }
            }
        }
        
        /**
         * Ha a condition érvényesül akkor felfelé világító fény lesz
         */
        var indicatorUp = function(lift, condition) {
            if (condition === true) {
                lift.goingUpIndicator(true);
                lift.goingDownIndicator(false);
            }
        }
        
        /**
         * Ha a condition érvényesül akkor lefelé világító fény lesz
         */
        var indicatorDown = function(lift, condition) {
            if (condition === true) {
                lift.goingUpIndicator(false);
                lift.goingDownIndicator(true);
            }
        }
        
        /**
         * Indicatorok alapállapotba állnak
         */
        var resetIndicators = function(lift) {
            lift.goingUpIndicator(true);
            lift.goingDownIndicator(true);
        }
        
        
        
        
        var updateQueue = function(lift) {
            return false;
            
            var pressed = lift.getPressedFloors();
            lift.destinationQueue = lift.destinationQueue.filter(function(floorNum) {
                return pressed.indexOf(floorNum) != -1;
            });
            lift.checkDestinationQueue();
            
            console.log('Szűrés');
            console.log('pressed btns:', pressed);
            console.log('q', lift.destinationQueue);
        }
        
        var sortStops = function(lift) {
            var q = lift.destinationQueue.sort();
            console.log(q);
            return q;
        }
        
        var getNearestLift = function(elevators, floor) {
            // TODO valós rendezés kell ide
            var nearest = elevators[0];
            var distance = 100;
            elevators.forEach(function(lift) {
                var targetFloorDistance = Math.abs(lift.currentFloor() - floor.floorNum());
                if (targetFloorDistance < distance) {
                    distance = targetFloorDistance;
                    nearest = lift;
                }
            })
            return nearest;
        }
        
        /**
         * Ha már szerpel a lift célállomásai között az adott emelet true-val tér vissza.
         */
        var alreadyInQueue = function(lift, floorNum) {
            return lift.destinationQueue.indexOf(floorNum) > -1;
        }
        
        /**
         * Array.diff()
         */
        /*Array.prototype.diff = function(a) {
            return this.filter(function(i) {return a.indexOf(i) < 0;});
        };*/
 
        /**
         * Visszaadja a legközelebbi értéket
         */
        var closest = function(goal, list) {
            return list.reduce(function (prev, curr) {
                return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
            });
        }
        
        /**
         * Array.push()-hoz hasonló, de nem duplikál
         */
        var uniquePush = function(list, item) {
            if (list.indexOf(item) == -1) {
                list.push(item);
            }
            return list;
        }
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}