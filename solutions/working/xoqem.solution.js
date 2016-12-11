{
  name: 'xoqem\'s solution for all levels (though not optimized for number of moves)',
  url: 'https://github.com/xoqem/ElevatorSagaSolution',
  init: function(elevators, floors) {

    // set this to true to have the elevator logs shown in the console
    var showLogStatements = false;

    // Create floor object from floor, we'll make one of these objects for
    // each floor.  This will keep the state of whether or the floor button
    // is off or on by handling the arrow button presses for that floor.
    function createFloorObj(floor, index) {
      var floorObj = {

        // is the up arrow on for this floor
        upArrowOn: false,

        // is the down arrow on for this floor
        downArrowOn: false,

        // convenience property to get the floor number for this floor
        floorNum: floor.floorNum()
      };

      // Handle the up button being pressed on a floor
      floor.on('up_button_pressed', function() {
        floorObj.upArrowOn = true;
        wakeAnIdleElevator();
      });

      // Handle the down button being pressed on a floor
      floor.on('down_button_pressed', function() {
        floorObj.downArrowOn = true;
        wakeAnIdleElevator();
      });

      return floorObj;
    }

    // Returns a nifty string that shows the up/down arrow state for every floor in the
    // building.  Great for use in logging/debugging/
    function getFloorsStatus() {
      var logs = _.map(floorObjs, function(floorObj) {
        return '( ' + (floorObj.upArrowOn ? '▲' : '-') + ' ' + (floorObj.downArrowOn ? '▼' : '-') + ' )';
      }, this);
      return logs.join(' ');
    }

    // Create an array of floor objects (one for each floor)
    var floorObjs = _.map(floors, createFloorObj, this);

    // Create elevator object from elevator, we'll make one these object for each elevator.
    // It is responsible for handling elevator events, and choosing a destination.  It also
    // keeps track of what buttons are selected inside the elevator.
    //
    // The basic algorithm is if going up, find the highest floor we should go to, and head
    // toward that floor.  If going down, find the lowest foor we should go to.  On the way
    // to the destination floor, we check as we pass each floor, if we should stop to let
    // someone off the elevator, or if we have room and someone is waiting on the floor to
    // go in our direction, stop at that floor befor continuing toward the destination floor.
    // We check as we pass each floor to see if we should update the destination floor, due
    // to someone on the elevator selecting a floor, or new elevator calls coming in from
    // floors.
    function createElevatorObj(elevator, index) {
      var elevatorObj = {

        // Just a convenience property, to differentiate the elevator from
        // other elevators in debugging.
        id: index,

        // This will be the floor we are headed to at any given time.  More
        // reliable than checking the destination queue, because it may get
        // cleared out when we arrive at the destination, but we'd still
        // like to be able to know if we are handling a random stop event,
        // or if we are stopping at our expected final destination.
        destinationFloor: NaN,

        // This will be set to a floor number if the elevator is passing a
        // and has determined it should make stop.
        stoppingAtFloor: NaN,

        // Are we going up (we assume that not going up, means going down)
        goingUp: true,

        // Spread the default floor (when idle) for each elevator throughout
        // the bottom half of the building.  I played with a couple of options
        // here from having no default (so it would just stay on its current
        // floor if idle), to distributing the defaults throughout the building,
        // and 0 seemed to be as good or better than any of the other options
        defaultFloor: 0,

        // creates an array with a false (button off) for every floor
        floorButtonOn: _.map(floors, function() {
          return false;
        }, this),

        // Does the elevaor have room to pick up more people?  The load
        // facor is expected to be between 0 (empty) and 1 (full), though
        // it is a fuzzy number based on passenger weight.  If we have
        // just one elevator, we may bump this number up a bit, as we
        // would probably want to make sure it was more full.  For multiple
        // elevators, we often have a free elevator, so we want to keep
        // the load low, to encourage the elvator to skip floors if it
        // already has a few passengers, and let another elevator pick
        // up the waiting passenger.
        hasRoom: function() {
          return elevator.loadFactor() < 0.6;
        },

        // Just a convenience, pass through method to to the elevator's
        // method to get the current floor.
        currentFloor: function() {
          return elevator.currentFloor();
        },

        // Updates the arrow indicators for the elevator based on
        // whether or not we are going up.
        updateArrowIndicator: function() {
          elevator.goingUpIndicator(elevatorObj.goingUp);
          elevator.goingDownIndicator(!elevatorObj.goingUp);
        },

        // Should we stop at this floor on the way to our destination,
        // generally you will only call this when you are passing a
        // floor and deciding if you should stop.
        shouldStopAtFloor: function(floorNum) {
          // if someone in the elevator has requested this stop, we must
          // stop at the floor, regardless of other factors
          if (elevatorObj.floorButtonOn[floorNum]) return true;

          // if we don't have room, no reason to stop
          if (!elevatorObj.hasRoom()) return false;

          // otherwise, see if someone is waiting on the floor going in our
          // direction
          var floorObj = floorObjs[floorNum];
          if ((elevatorObj.goingUp && floorObj.upArrowOn) ||
              (!elevatorObj.goingUp && floorObj.downArrowOn))
          {
            // make sure another valid elevator isn't already stopping here
            for (var i = 0; i < elevatorObjs.length; i++) {
              var otherElevatorObj = elevatorObjs[i];
              if (otherElevatorObj !== elevatorObj &&
                otherElevatorObj.stoppingAtFloor === floorNum &&
                otherElevatorObj.goingUp === elevatorObj.goingUp &&
                otherElevatorObj.hasRoom())
              {
                // another elevator already stopping, so we shouldn't
                return false;
              }
            }

            // if we have someone waiting, and no other elevators are already
            // stoppping, we should stop
            return true;
          }

          // if no reason was found to stop, return false
          return false;
        },

        // A destination is considered a good choice for a destination if
        // either someone inside the elevator has requested this floor or
        // if someone on the floor has called for an elevator, and another
        // elevator isn't already headed to that floor.
        isGoodDestination: function(floorNum) {

          // did someone press the button for this floor inside the elevator
          if (elevatorObj.floorButtonOn[floorNum]) {
            return true;
          }

          // did someone press a button to call an elevator to this floor
          if (floorObjs[floorNum].upArrowOn || floorObjs[floorNum].downArrowOn) {

            var floorDistance = Math.abs(floorNum - elevatorObj.currentFloor());

            // if so, make sure a closer elevator going in our direction isn't already
            // going to this destination
            for (var i = 0; i < elevatorObjs.length; i++) {
              var otherElevatorObj = elevatorObjs[i];
              var otherFloorDistance = Math.abs(floorNum - otherElevatorObj.currentFloor());

              if (elevatorObj !== otherElevatorObj &&
                otherFloorDistance <= floorDistance &&
                otherElevatorObj.destinationFloor === floorNum &&
                otherElevatorObj.goingUp === elevatorObj.goingUp &&
                otherElevatorObj.hasRoom())
              {
                // another elevator already handling this one, so not a good choice
                return false;
              }
            }

            // no other elevator handling this one
            return true;
          }

          // otherwise, this isn't a good destination
          return false;
        },

        // This will return the lowest floor in the building that passes the good destination
        // test.  Useful if we are headed back down and want to know how far to go.
        getBottomFloorToVisit: function() {
          for (var floorNum = 0; floorNum < floors.length; floorNum++) {
            if (elevatorObj.isGoodDestination(floorNum)) {
              return floorNum;
            }
          }
        },

        // This will return the highest floor in the building that passes the good destination
        // test.  Useful if we are headed up and want to know how far to go.
        getTopFloorToVisit: function() {
          for (var floorNum = elevatorObj.floorButtonOn.length - 1; floorNum >= 0; floorNum--) {
            if (elevatorObj.isGoodDestination(floorNum)) {
              return floorNum;
            }
          }
        },

        // Sets the destination floor to the passed in floorNum.  Handles clearing the
        // queue of floors to go to, as well as updating the direction indicators for the
        // elevator.
        setDestinationFloor: function(floorNum) {
          // if we've already set this destination, just return
          if (elevatorObj.destinationFloor === floorNum) return;

          elevatorObj.destinationFloor = floorNum;

          elevator.destinationQueue = [];
          if (_.isFinite(floorNum)) {
            elevator.destinationQueue.push(floorNum);
            elevatorObj.goingUp = (floorNum >= elevatorObj.currentFloor());
          }
          elevatorObj.updateArrowIndicator();
          elevator.checkDestinationQueue();
        },

        // Searches for the best destination floor for this elevator, and sets
        // the elvator to go to that destination.  If going up, the best destination
        // will be the highest good destination floor.  If going down, it will be
        // the lowest good destination floor.  If it fails to find a good choice
        // for the direction in which we are going, it reverses direction and
        // searches in the other direction.  If that also fails, it will send the
        // elevator to its default resting floor (if it has one), or clear the
        // queue if it has no default floor (and the elevator would become idle
        // in that case)
        updateDesitnationFloor: function() {
          var floorToVisit;

          if (elevatorObj.goingUp) {
            floorToVisit = elevatorObj.getTopFloorToVisit();
            if (!_.isFinite(floorToVisit)) {
              floorToVisit = elevatorObj.getBottomFloorToVisit();
              elevatorObj.goingUp = false;
            }
          } else {
            floorToVisit = elevatorObj.getBottomFloorToVisit();
            if (!_.isFinite(floorToVisit)) {
              floorToVisit = elevatorObj.getTopFloorToVisit();
              elevatorObj.goingUp = true;
            }
          }

          if (!_.isFinite(floorToVisit)) {
            floorToVisit = elevatorObj.defaultFloor;
          }

          elevatorObj.setDestinationFloor(floorToVisit);
          elevatorObj.logStatus('updateDesitnationFloor');
        },

        // log the elevator status to the console (and adds any passed in arguments to the log)
        logStatus: function() {
          if (!showLogStatements) return;

          console.log('Elevator', elevatorObj.id, '-', arguments);
          console.log('currentFloor:', elevatorObj.currentFloor());
          console.log('goingUp:', elevatorObj.goingUp, '( ', elevator.goingUpIndicator() ? '▲' : '-', ' ', elevator.goingDownIndicator() ? '▼' : '-', ' )');
          console.log('destinationFloor:', elevatorObj.destinationFloor);
          console.log('destinationQueue:', elevator.destinationQueue);
          console.log('floorButtonOn:', elevatorObj.floorButtonOn);
          console.log('floors', getFloorsStatus());
          console.log('load', elevator.loadFactor());
          console.log('');
        }
      };

      // Handle when someone presses a floor button inside the elevator
      elevator.on("floor_button_pressed", function(floorNum) {
        elevatorObj.floorButtonOn[floorNum] = true;
        elevatorObj.updateDesitnationFloor();
      });

      // Handle the event that first just before we pass a floor.  Decides if we
      // should stop at this floor.
      elevator.on("passing_floor", function(floorNum, direction) {
        // Just in case the final floor we should be targetting has changed since last floor
        elevatorObj.updateDesitnationFloor();

        // if someone in the elevator has requested this floor, or if we have room
        // in the elevator and someone on the floor has called an elevator for our
        // direction, then go to that floor
        if (elevatorObj.shouldStopAtFloor(floorNum)) {
          // passing true will cause us to stop at this floor first, before
          // continuing to the current destination
          elevator.goToFloor(floorNum, true);

          // set the stoppingAtFloor value so other elevators will know
          // if we are about to visit a floor that they are considering
          elevatorObj.stoppingAtFloor = floorNum;
        }

        elevatorObj.logStatus('passing_floor');
      });

      // Handle when the elevator has stopped at a floor
      elevator.on('stopped_at_floor', function(floorNum) {
        var floorObj = floorObjs[floorNum];

        // clear the stoppingAtFloor
        elevatorObj.stoppingAtFloor = NaN;

        // if we have arrived ar our destination
        if (elevatorObj.destinationFloor === floorNum) {

          // clears the destination floor
          elevatorObj.destinationFloor = NaN;

          // if we are going up, but there is only someone going down on this floor,
          // reverse directions, and flip the indicator so the passenger will get in
          if (elevatorObj.goingUp && !floorObj.upArrowOn && floorObj.downArrowOn) {
            elevatorObj.goingUp = false;
            elevatorObj.updateArrowIndicator();

          // if we are going down, but there is only someone going up on this floor,
          // reverse directions, and flip the indicator so the passenger will get in
          } else if (!elevatorObj.goingUp && floorObj.upArrowOn && !floorObj.downArrowOn) {
            elevatorObj.goingUp = true;
            elevatorObj.updateArrowIndicator();

          // otherwise, if there is no one waiting on this floor, find our next
          // destination
          } else if (!floorObj.upArrowOn && !floorObj.downArrowOn) {
            elevatorObj.updateDesitnationFloor();
          }
        }

        // turn off inside elevator button for floor
        elevatorObj.floorButtonOn[floorNum] = false;

        // turn off floor arrow buttons if needed
        if (elevatorObj.goingUp && floorObj.upArrowOn) {
          floorObj.upArrowOn = false;
        } else if (!elevatorObj.goingUp && floorObj.downArrowOn) {
          floorObj.downArrowOn = false;
        }

        elevatorObj.logStatus('stopped_at_floor');
      });

      // Handle the elevator becoming idle.
      elevator.on('idle', function() {

        // Flip both indicators on if we are idle, this will cause
        // a passenger that appears on this floor to use the elevator,
        // regardless of what direction they are traveling.
        elevator.goingUpIndicator(true);
        elevator.goingDownIndicator(true);

        // search for a new destination
        elevatorObj.updateDesitnationFloor();

        elevatorObj.logStatus('idle');
      });

      return elevatorObj;
    }

    // Create an array of elevator objects (one for each elevator)
    var elevatorObjs = _.map(elevators, createElevatorObj, this);

    // Find the first idle elevator and tell it to check for a destination
    function wakeAnIdleElevator() {
      for (var i = 0; i < elevatorObjs.length; i++) {
        var elevatorObj = elevatorObjs[i];
        if (!_.isFinite(elevatorObj.destinationFloor)) {
          elevatorObj.updateDesitnationFloor();
          break;
        }
      }
    }
  },

  update: function(dt, elevators, floors) {
    // We normally don't need to do anything here
  }
}