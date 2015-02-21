{
    /* This is my (Joel Yliluoma's) solution to Elevator Saga at http://play.elevatorsaga.com/ */
    /* This code plows through all challenges from #1 to #17. However, note:
     * In challenge #6, you need to change one of the limits, below. (Indicated in comments.)
     * In the max-wait challenges, you may need to click Restart a few ones to get better luck.
     */
    /* Check out my programming-related YouTube channel! http://youtube.com/user/Bisqwit */
    name: 'Bisqwit\'s solution for all levels',
    url: 'https://github.com/magwo/elevatorsaga/wiki/Solution-by-Bisqwit',
    init: function(elevators, floors) {
        var bot=999, top=-999, age={}, totalage=1;
        var summonUp={};  // List of floors where any elevator has been summoned to go up
        var summonDn={};  // List of floors where any elevator has been summoned to go down

        // Configurable settings:
        var MaxElevators      = 99;    // Change this number into 1 for challenges #6 and #7
        var ExplicitSummons   = false; // If true, users can directly summon elevators. Theoretically it decreases latency.
        var TaskRobbing       = true;  // If true, an elevator can rob the task from another elevator
        var WaitingCoeff      = 500;   // How much priority on the age of passengers' wishes in scheduling
        var AgeCoeff          = 1;     // How much priority on the age of floor-visiting in scheduling
        var DistanceCoeff     = 10;    // How much priority on distance in scheduling
        var MaxSummonWeight   = 0.3;   // Maximum weight to divert route to pick new passengers
        var MaxSummonWeight2  = 0.7;   // Same as above, but when we have passengers who'll leave first
        var UtilizeIndicators = true;  // Set to false to ignore arrow indicators.
        var ForceReroute      = true;  // Whether to signal other elevators to reroute if we arrive first

        // verifySummons: Called whenever someone summons an elevator. Only used when ExplicitSummons=true.
        var verifySummons = ExplicitSummons ? function(f)
        {
            // Check whether any elevator is currently coming here.
            // If not, but there's an elevator moving towards a floor
            // for no good reason, reassign that elevator to come here.
            var closestDistance = 999, closest = null, pending = false;
            elevators.forEach(function(e) {
                if(e.currentTarget == f) pending = true; // He's coming right now.
                //if(e.pOrder[f]) pending = true;        // He's coming eventually.
                if(e.currentTarget >= 0
                && !Object.keys(e.pOrder).length
                && !summonUp[e.currentTarget]
                && !summonDn[e.currentTarget])          // He's not busy.
                {
                    var distance = Math.abs(e.currentFloor() - f);
                    if(distance < closestDistance)
                    {
                        closestDistance = distance;
                        closest         = e;
                    }
                }
            })
            if(!pending && closestDistance < 999)
                closest.reschedule(f) // Explicitly summon this elevator in particular
        } : function(){};

        floors.forEach(function(f) {
            var fn = f.floorNum();
            // Find top and bottom floors (I thought there might be elevators that only go between certain floors)
            if(fn > top) top = fn;
            if(fn < bot) bot = fn;
            f.on("up_button_pressed",   function() { summonUp[fn] = true; verifySummons(fn) } );
            f.on("down_button_pressed", function() { summonDn[fn] = true; verifySummons(fn) } );
            age[fn] = 0;
        });

        var elevno=0;
        elevators.forEach(function(e) { 
            if(elevno >= MaxElevators) return;
            e.pOrder = {};  // List of floors where passengers currently want to go.
            e.currentOrigin = elevno++;  // Where we last stopped.
            e.currentTarget = -1;        // Our current heading (floor number)
            e.goingDnIndicator = e.goingDownIndicator; // Create a function alias.
            e.goingUpIndicator(true); // Start with both up & down indicators shining.
            e.goingDnIndicator(true);
            // reschedule: Cancel whereever the elevator is currently heading
            //             f: New floor number (-1 = choose with algorithm)
            e.reschedule = function(f)
            {
                // Cancel the current target
                e.destinationQueue = [];
                if(UtilizeIndicators)
                {
                    // Calculate which passengers we would like to pick
                    // - If we have a pOrder that is above current floor, set up-indicator
                    // - If we have a pOrder that is below current floor, set dn-indicator
                    // - If we don't have any pOrders at all, set both indicators
                    var up = false, dn = false;
                    for(var order in e.pOrder)
                    {
                        if(order == f) continue; // Ignore the current heading
                        if(order > e.currentFloor()) up = true;
                        if(order < e.currentFloor()) dn = true;
                    }
                    e.goingUpIndicator(up || !dn)
                    e.goingDnIndicator(dn || !up)
                }
                // And set a new heading!
                e.currentTarget = f;
                if(f >= 0)
                    e.goToFloor(f);    // Go to this floor
                else
                    e.trigger("idle"); // Calculate a new target
            };
            // couldPickPassengers: Determine whether we could pick passengers in given floor
            e.couldPickPassengers = function(f, robbing, summoned, indicator)
            {
                var maxLoad = (e.pOrder[f] ? MaxSummonWeight2 : MaxSummonWeight);
                if(summoned[f] && indicator(e) && e.loadFactor() < maxLoad)
                {
                    // Check if some other elevator is also acting on this request.
                    var bad = false;
                    elevators.forEach(function(e2) {
                        // Even if they are, but they are farther than we are, consider robbing their task.
                        if(e2.currentTarget == f && indicator(e2)
                        && (!robbing || e2.pOrder[f] || Math.abs(e2.currentFloor() - f) < Math.abs(e.currentFloor() - f)))
                            bad = true;
                     });
                    if(!bad) return true;
                }
                return false;
            };
            e.couldPickPassengersUp = function(f,r) { return e.couldPickPassengers(f,r,summonUp, function(obj){return obj.goingUpIndicator()}) }
            e.couldPickPassengersDn = function(f,r) { return e.couldPickPassengers(f,r,summonDn, function(obj){return obj.goingDnIndicator()}) }

            e.on("floor_button_pressed", function(f) { e.pOrder[f] = totalage++ });

            e.on("passing_floor", function(f,dir) {
                // If we're passing by a floor, check if there's/ a good reason to make an unscheduled stop there.
                // However, don't rob another elevator, or the candidate scoring in idle() is for nothing.
                if(f == e.currentTarget) return;
                if(e.pOrder[f]    // If the elevator must stop in this floor (but is currently heading some other floor)
                || e.couldPickPassengersDn(f,false)
                || e.couldPickPassengersUp(f,false))
                {
                    e.reschedule(f);
                }
            });
            e.on("stopped_at_floor", function(f) {
                // We have arrived at this floor.
                delete e.pOrder[f];   // Nobody aboard anymore who wants to exit here.
                e.currentTarget = -1; // We're actually going nowhere right now.
                e.currentOrigin = f;  // And this is our new point of origin.
                age[f] = ++totalage;  // Age will be used to prioritize floors.
                // Check whether some other elevator is heading to this floor
                if(ForceReroute)
                    elevators.forEach(function(e2){
                        // They are, and it's not because they have passengers leaving there.
                        if(e2.currentTarget == f && !e2.pOrder[f]
                        && e.goingUpIndicator() >= e2.goingUpIndicator()
                        && e.goingDnIndicator() >= e2.goingDnIndicator())
                        {
                            e2.reschedule(-1);
                        }
                });
                // If we don't have any passengers anymore, set both indicators
                if(!Object.keys(e.pOrder).length) { e.goingUpIndicator(true); e.goingDnIndicator(true); }
                // An elevator is no longer being summoned here.
                if(e.goingUpIndicator()) delete summonUp[f];
                if(e.goingDnIndicator()) delete summonDn[f];
            });
            e.on("idle", function(){
                var cur = e.currentFloor(),  bestscore=-1e30, target = e.currentOrigin;
                // Pick a target. Evaluate each floor.
                for(var f = bot; f <= top; ++f)
                {
                    // Ignore requests to go to a floor we're already in, unless we're currently moving
                    if(f == cur && e.currentTarget == -1) { continue; }
                    // Deal with a request only on three conditions:
                    // - Our passenger wants to go there
                    // - An elevator has been summoned there and nobody else is doing it
                    // - Someone else is doing it, but we're in a better position to do it (task robbing)
                    if(e.pOrder[f]
                    || e.couldPickPassengersUp(f, TaskRobbing)
                    || e.couldPickPassengersDn(f, TaskRobbing))
                    {
                        // The score is how eager we are to take this particular floor
                        //   Math.abs(f - cur)  = the distance to the current floor.
                        //   totalage-age[f]    = How many ticks since someone last landed in that floor
                        //   totalage-pOrder[f] = How long have customers been waiting this floor
                        var score = (totalage-age[f])*AgeCoeff - Math.abs(f - cur)*DistanceCoeff;
                        if(e.pOrder[f]) score += WaitingCoeff*(totalage - e.pOrder[f]);
                        if(score > bestscore) { bestscore=score; target=f; }
                    }
                }
                // Get the highest ranking candidate, and honor it.
                e.reschedule(target);
            });
        });
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}