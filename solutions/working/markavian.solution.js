{
    name: 'Markavian\'s Solution for all levels, with a mode switch',
    url: 'https://github.com/magwo/elevatorsaga/wiki/Markavian\'s-Solution',
    init: function(elevators, floors) {
        
        var stopAtRequests = false;
        var sharedRequestList = [];
        
        Array.prototype.contains = function(obj) {
            var i = this.length;
            while (i--) {
                if (this[i] === obj) {
                    return true;
                }
            }
            return false;
        }
        
        Array.prototype.removeAll = function(item) {
            for(var i = this.length; i--;) {
                if(this[i] === item) {
                    this.splice(i, 1);
                }
            }
        }
        
        Array.prototype.produceSet = function() {
            var seen = {};
            var out = [];
            var len = this.length;
            var j = 0;
            for(var i = 0; i < len; i++) {
                 var item = this[i];
                 if(seen[item] !== 1) {
                     seen[item] = 1;
                     out[j++] = item;
                 }
            }
            return out;
        }
        
        function goToFloor(elevator, floorNum, priority) {
            elevator.goToFloor(floorNum, priority)  
            // console.log("Before reduction : (" + floorNum + ") " + elevator.destinationQueue);
            sharedRequestList.produceSet();
            elevator.destinationQueue = elevator.destinationQueue.produceSet();
            elevator.checkDestinationQueue();
            // console.log("After reduction  : (" + floorNum + ") " + elevator.destinationQueue);
        }
        
        function startGoingDown(elevator) {
            elevator.goingDown();
            goToFloor(elevator, 0, true);
        }
        
        function takeARequest(elevator) {
            var currentFloor = elevator.currentFloor();
            var floorNum = 0;
            if(sharedRequestList.length > 0) {
                // decode request
                var direction = sharedRequestList.shift();
                floorNum = Math.abs(direction);
 
                // set elevator arrows
                if(direction >= 0) {
                    elevator.goingUp();
                }
                else if(direction < 0) {
                    elevator.goingDown();   
                }
                
                console.log("Heading for " + floorNum + " [" + sharedRequestList + "]");
            }
            else {
                floorNum = currentFloor;
            }
            goToFloor(elevator, floorNum);
        }
        
        for(var i=0; i<elevators.length; i++) {
            var elevator = elevators[i];
 
            elevator.defaultFloor = i;
            
            elevator.goingUp = function() {
                this.goingDownIndicator(false);
                this.goingUpIndicator(true);
            }
            
            elevator.goingDown = function() {
                this.goingDownIndicator(true);
                this.goingUpIndicator(false);
            }
            
            elevator.goingAnyWhere = function() {
                this.goingDownIndicator(true);
                this.goingUpIndicator(true);
            }
            
            elevator.on("idle", function() {
                takeARequest(this);
            });
        
            elevator.on("passing_floor", function(floorNum, direction) {
                
                // stop at a registered destination
                if(this.destinationQueue.contains(floorNum)) {
                    goToFloor(this, floorNum, true);
                    console.log("Stopping at passing destination");
                }
                
                // decide to stop
                if(this.loadFactor() < 0.7 && stopAtRequests) {
                    if(this.goingUpIndicator() && sharedRequestList.contains(floorNum)) {
                        sharedRequestList.removeAll(floorNum);
                        goToFloor(this, floorNum, true)
                        console.log("Stopping at passing up request");
                    }
                    else if(this.goingDownIndicator() && sharedRequestList.contains(-floorNum)) {
                        sharedRequestList.removeAll(-floorNum);
                        goToFloor(this, floorNum, true);
                        console.log("Stopping at passing down request")
                    }
                }
                
                // update the going up and down indicators
                var currentFloor = this.currentFloor();
                if(this.destinationQueue.length > 0) {
                    if(currentFloor < this.destinationQueue[0]) {
                        this.goingUp();
                    }
                    else {
                        this.goingDown();
                    }
                }
            });
            
            elevator.on("stopped_at_floor", function(floorNum) {
                
                // clear the indicators if empty
                if(this.loadFactor() == 0 || this.destinationQueue.length == 0) {
                    this.goingAnyWhere();   
                }
                
                // house keeping
                if(this.goingUpIndicator()) {
                    sharedRequestList.removeAll(floorNum);
                }
                if(this.goingDownIndicator()) {
                    sharedRequestList.removeAll(-floorNum);
                }
                // update indicators limiting by floor
                if(floorNum == 0) { 
                    this.goingUp();
                }
                else if(floorNum == floors.length - 1) {
                    this.goingDown();
                }
            });
        
            elevator.on("floor_button_pressed ", function(floorNum) {
                goToFloor(this, floorNum);
            });
        }
        
        for(var i=0; i<floors.length; i++)
        {
            var floor = floors[i];
            floor.on("up_button_pressed ", function() {
                var floorNum = this.floorNum();
                               
                sharedRequestList.push(floorNum);
                sharedRequestList = sharedRequestList.produceSet();
            });
        
            floor.on("down_button_pressed ", function() {
                var floorNum = this.floorNum();
                
                sharedRequestList.push(-floorNum);
                sharedRequestList = sharedRequestList.produceSet();
            });
        }
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    },
    
}