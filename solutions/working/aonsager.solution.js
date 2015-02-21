{
  name: 'aonsager\'s solution',
  url: 'https://github.com/magwo/elevatorsaga/wiki/aonsager%27s-solution',
  init: function(elevators, floors) {
    var downQueue = [];
    var upQueue = [];
    var idleElevators = []
    var topFloor = floors.length - 1;

    var goToAndSetIndicator = function(elevator, floorNum) {
      if (floorNum < elevator.currentFloor()) {
        elevator.goingDownIndicator(true);
        elevator.goingUpIndicator(false);
      } else {
        elevator.goingUpIndicator(true);
        elevator.goingDownIndicator(false);
      }
      elevator.goToFloor(floorNum);
    }

    var callElevator = function(queue, floorNum) {
      // if there is an idle elevator, wake it up
        if (idleElevators.length > 0) {
          elevator = idleElevators.shift();
          goToAndSetIndicator(elevator, floorNum);
        } else {
          // otherwise add it to the corresponding queue and wait for an elevator to pass
          if (queue.indexOf(floorNum) < 0) queue.push(floorNum);
          queue = downQueue.sort();
        }
    }

    _.each(elevators, function(elevator) {

      elevator.on("idle", function() {
        // see if there's anyone waiting
        if (upQueue.length + downQueue.length > 0) {
          // if we were going up, go to the highest floor with a person waiting
          // otherwise, go to the lowest floor with a person waiting
          if (elevator.goingUpIndicator()) {
            floorNum = (downQueue.length > 0 ? downQueue.pop() : upQueue.pop())
          } else {
            floorNum = (upQueue.length > 0 ? upQueue.shift() : downQueue.shift())
          }
          goToAndSetIndicator(elevator, floorNum);
        } else {
          // if nobody was waiting, record that this elevator is idle, so it can be woken up later
          idleElevators.push(elevator);
          elevator.goingDownIndicator(false);
          elevator.goingUpIndicator(false);
        }
      });

      elevator.on("floor_button_pressed", function(floorNum) {
        // add the new floor to the queue if it wasn't already requested
        if (elevator.destinationQueue.indexOf(floorNum) < 0 ) {
          elevator.destinationQueue.push(floorNum);
          // sort to make sure we visit floors in order
          elevator.destinationQueue = elevator.destinationQueue.sort();
          if (elevator.goingDownIndicator()) {
            elevator.destinationQueue = elevator.destinationQueue.reverse();
          }
          // apply the changes
          elevator.checkDestinationQueue();
        }
      });

      elevator.on("stopped_at_floor", function(floorNum) {
          if (floorNum == 0) {
            // start moving up once we reach the bottom
            elevator.goingDownIndicator(false);
            elevator.goingUpIndicator(true);
          } else if (floorNum == topFloor) {
            // start moving down once we reach the top
            elevator.goingUpIndicator(false);
            elevator.goingDownIndicator(true);
          }
          else if (elevator.destinationQueue.length == 0) {
            // if this was our final stop, pick up anybody here
            // if we end up idling, then these will both get set to false
            elevator.goingUpIndicator(true);
            elevator.goingDownIndicator(true);
          }
          // remove this floor from the corresponding queue if we picked someone up
          if (elevator.goingUpIndicator()) {
            index = upQueue.indexOf(floorNum);
            if (index >= 0) upQueue.splice(index, 1);
          } else if (elevator.goingDownIndicator()) {
            index = downQueue.indexOf(floorNum);
            if (index >= 0) downQueue.splice(index, 1);
          }
      });

      elevator.on("passing_floor", function(floorNum, direction) {
        // check if there is someone here who wants to go our direction
        queue = direction == "up" ? upQueue : downQueue;
        index = queue.indexOf(floorNum);
        if (index >= 0 && elevator.loadFactor() < 0.7) {
          // if yes, and we have room, stop for them
          elevator.goToFloor(floorNum, true);
        }
      });
    });

    _.each(floors, function(floor) {

      floor.on("up_button_pressed", function() {
        callElevator(upQueue, floor.floorNum());
      });

      floor.on("down_button_pressed", function() {
        callElevator(downQueue, floor.floorNum());
      });
    });

  },
  update: function(dt, elevators, floors) {
    // We normally don't need to do anything here
  }
}