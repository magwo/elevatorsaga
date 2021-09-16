{
  init: function(elevators, floors) {
      var selectElevatorForFloorPickup = function(floorNum) {
          return _.max(elevators, function(e) {
              return (_.contains(e.destinationQueue, floorNum) ? 4 : 0) +
                  (-e.destinationQueue.length*e.destinationQueue.length) +
                  (-e.loadFactor()*e.loadFactor() * 3);
          });
      };

      _.each(floors, function(floor) {
          floor.on("down_button_pressed up_button_pressed", function() {
              var elevator = selectElevatorForFloorPickup(floor.level);
              if(!_.contains(elevator.destinationQueue, floor.level)) {
                  elevator.goToFloor(floor.level);
              }
          });
      });
      _.each(elevators, function(elevator) {
          elevator.on("floor_button_pressed", function(floorNum) {
              elevator.goToFloor(floorNum);
          });
          elevator.on("idle", function() {
              elevator.goToFloor(0);
          });
      });
  },
  update: function(dt, elevators, floors) {
  }
}
