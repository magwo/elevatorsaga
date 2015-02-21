{
  name: 'indutny\'s solution',
  url: 'https://gist.github.com/indutny/b717bff602dd205b52c1',
  init: function(elevators, floors) {
    var floorButtons = new Array(floors.length);
    var floorTime = new Array(floors.length);
    var UP = 1;
    var DOWN = 2;
    var DISABLED = 4;
    for (var i = 0; i < floorButtons.length; i++) {
      floorButtons[i] = 0;
      floorTime[i] = 0;
    }
 
    var global = this;
    this.time = 0;
 
    var freeElevators = [];
    floors.forEach(function(floor) {
      function press(floor, button) {
        var num = floor.floorNum();
 
        if (floorButtons[num] & button)
          return;
        floorButtons[num] |= button;
 
        if (floorTime[num] === 0)
          floorTime[num] = global.time;
        summonElevator(floor);
      }
 
      floor.on('up_button_pressed', function() {
        press(floor, UP);
      });
 
      floor.on('down_button_pressed', function() {
        press(floor, DOWN);
      });
    });
 
    function summonElevator(floor) {
      var elevator = freeElevators.shift();
 
      // All elevators busy
      if (!elevator)
        return;
 
      elevator.move(floor);
    }
 
    var megaElevators = elevators.map(function(elevator, i) {
      return new Elevator(elevator, i);
    });
 
    function Elevator(elevator, index) {
      this.proxy = elevator;
      this.dir = 0;
      this.buttons = new Array(floors.length);
      for (var i = 0; i < this.buttons.length; i++)
        this.buttons[i] = false;
 
      this.index = index;
      this.defaultFloor = floors[
        Math.floor((index / elevators.length) * floors.length)];
      this.pickTime = 0;
 
      var self = this;
      this.proxy.on('floor_button_pressed', function(floorNum) {
        if (floorNum !== self.proxy.currentFloor())
          self.buttons[floorNum] = true;
      });
 
      this.proxy.on('stopped_at_floor', function(floorNum) {
        self.onStoppedAt(floors[floorNum]);
      });
 
      this.proxy.on('passing_floor', function(floorNum) {
        self.onPassingFloor(floors[floorNum]);
      });
 
      this.proxy.on('idle', function idle() {
        self.onidle();
      });
    }
 
    Elevator.prototype.onidle = function onidle() {
      // No people - wait for a button press
      if (this.proxy.loadFactor() === 0)
        return this.onEmpty();
 
      this.onFull();
    };
 
    Elevator.prototype.updateDir = function updateDir(floor) {
      var cur = this.proxy.currentFloor();
      var floorNum = floor.floorNum();
 
      this.dir = floorNum > cur ? 1 : floorNum < cur ? -1 : 0;
      this.updateIndicators();
    };
 
    Elevator.prototype.updateIndicators = function updateIndicators() {
      if (this.dir === 0) {
        // Accept everyone!
        this.proxy.goingUpIndicator(true);
        this.proxy.goingDownIndicator(true);
      } else {
        this.proxy.goingUpIndicator(this.dir > 0);
        this.proxy.goingDownIndicator(this.dir < 0);
      }
    };
 
    Elevator.prototype.move = function move(floor) {
      floorButtons[floor.floorNum()] |= DISABLED;
      this.buttons[floor.floorNum()] = false;
      this.updateDir(floor);
      this.proxy.goToFloor(floor.floorNum());
    };
 
    Elevator.prototype.findButton = function findButton() {
      // Move to the closest floor button in current direction
      var currentFloor = this.proxy.currentFloor();
 
      var dir = this.dir;
 
      // Try both directions
      if (dir === 0)
        dir = 1;
 
      // Find floor with the best fitness
      var now = global.time;
      var minFit = Infinity;
      var floor = null;
      for (var j = 0; j < 2; j++) {
        for (var i = currentFloor; i < floors.length && i >= 0; i += dir) {
          if (this.proxy.loadFactor() >= 0.7) {
            // Full elevator, ignore wall buttons
            if (!this.buttons[i])
              continue;
          } else {
            // Either of buttons if there is space in elevator
            if (!floorButtons[i] && !this.buttons[i])
              continue;
            if ((floorButtons[i] & DISABLED) && !this.buttons[i])
              continue;
          }
 
          var fit = Math.abs(i - currentFloor);
          fit = 1 + fit * fit;
 
          var dt = Math.max(0, floorTime[i] - now);
          dt = dt * dt;
          fit /= (1 + dt);
 
          // Check that direction matches
          if (this.dir !== 0) {
            if (dir > 0 && !(floorButtons[i] & UP))
              fit *= 8;
            else if (dir < 0 && !(floorButtons[i] & DOWN))
              fit *= 8;
          }
 
          // Boost elevator buttons if not empty
          if (this.buttons[i])
            fit /= (0.1 + this.proxy.loadFactor()) * 10;
 
          // Boost same direction
          if (this.dir !== 0 && dir === this.dir)
            fit *= 0.75;
 
          if (fit >= minFit)
            continue;
 
          minFit = fit;
          floor = floors[i];
        }
 
        // Swap the direction
        dir = -dir;
      }
 
      return floor;
    };
 
    // Modes
 
    Elevator.prototype.onEmpty = function onEmpty() {
      // Move to the closest floor button
      var floor = this.findButton();
      if (floor)
        return this.move(floor);
 
      /*
      // Already on default floor
      if (this.defaultFloor.floorNum() === this.proxy.currentFloor()) {
      */
        this.updateDir(floors[this.proxy.currentFloor()]);
        freeElevators.push(this);
        return;
      /*
      }

      // Move to default floor
      this.move(this.defaultFloor);
      */
    };
 
    Elevator.prototype.onFull = function onFull() {
      // Move to the closest elevator button in current direction
      var floor = this.findButton();
 
      // Stupid passengers
      if (!floor)
        return this.onEmpty();
 
      this.move(floor);
    };
 
    Elevator.prototype.onPassingFloor = function onPassingFloor(floor) {
      var button = floorButtons[floor.floorNum()];
      if (button === 0)
        return;
      if (button & DISABLED)
        return;
 
      // The direction should match (if any is present)
      if (this.dir > 0 && !(button & UP))
        return;
      if (this.dir < 0 && !(button & DOWN))
        return;
 
      // Full elevator
      if (this.proxy.loadFactor() > 0.7)
        return;
 
      // Do not stop, we are running out of time!
      if (Math.max(0, this.pickTime - global.time) > 7)
        return;
 
      // Stop!
      this.proxy.destinationQueue.unshift(floor.floorNum());
      this.proxy.checkDestinationQueue();
      floorButtons[floor.floorNum()] |= DISABLED;
    };
 
    Elevator.prototype.onStoppedAt = function onStoppedAt(floor) {
      // Clear direction if this is the final destination
      if (this.proxy.destinationQueue.length === 0)
        this.updateDir(floors[this.proxy.currentFloor()]);
      else
        this.updateIndicators();
 
      var num = floor.floorNum();
      if (this.pickTime === 0 && floorTime[num] !== 0)
        this.pickTime = floorTime[num];
      else
        this.pickTime = Math.min(this.pickTime, floorTime[num]);
 
      floorButtons[num] = 0;
      floorTime[num] = 0;
      this.buttons[num] = false;
    };
  },
  update: function(dt, elevators, floors) {
    // We normally don't need to do anything here
    this.time += dt;
  }
}