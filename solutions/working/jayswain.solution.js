{
    name: 'Jayswain\'s solution for 1 - 7',
    url: 'https://github.com/jayswain/elevator_saga_solution',
    init: function(elevators, floors) {
        var that = this;
        that.tempQueue = [];
        that.elevators = elevators;
        that.floors = floors;

        that.setElevatorHandlers();
        that.setFloorHandlers();
    },

    setElevatorHandlers: function(){
      var that = this;
      var i = 0;
      for(i < 0; i < that.elevators.length; i++){
        var elevator = that.elevators[i];
        that.setElevatorIdle(elevator);
        that.setElevatorButtonPress(elevator);
        that.setElevatorPassingFloor(elevator);
        that.setElevatorStoppedAtFloor(elevator);
      };
    },

    setElevatorIdle: function(elevator){
      var that = this;
      elevator.on("idle", function() {
        that.reset(elevator);
      });
    },

    setElevatorButtonPress: function(elevator){
      var that = this;
      elevator.on("floor_button_pressed", function(floorNum) {
        that.addFloorNumToElevatorQueueAndSend(elevator, floorNum);
      });
    },

    setElevatorPassingFloor: function(elevator){
      var that = this;
      elevator.on("passing_floor", function(floorNum, direction) {
        console.log("passing " + floorNum + "going " + direction);
        console.log(that.tempQueue);
        if(that.floorNumInTempQueue(floorNum)){
          console.log("add it to my queue");
          that.transferFloorNumFromTempQueueToElevator(floorNum, that.tempQueue, elevator, true);
        };
      });
    },

    elevatorGoingDirection: function(elevator, floorNum, direction){
      if(direction === "up"){
        return this.elevatorGoingUp(elevator, floorNum);
      } else {
        var answer = !(this.elevatorGoingUp(elevator, floorNum));
        return answer;
      }
    },

    setElevatorStoppedAtFloor: function(elevator){
      var that = this;
      elevator.on("stopped_at_floor", function(floorNum) {
        that.setArrowIndicator(elevator, floorNum);
      });
    },

    elevatorGoingUp: function(elevator, floorNum){
      var queueClone = elevator.destinationQueue.slice(0);
      var highestQueuedFloor = queueClone[queueClone.length -1];
      return ((floorNum === 0) || (highestQueuedFloor > floorNum));
    },

    setArrowIndicator: function(elevator, floorNum){
      if(this.elevatorGoingUp(elevator, floorNum)){
        elevator.goingDownIndicator(false);
        elevator.goingUpIndicator(true);
      } else {
        elevator.goingUpIndicator(false);
        elevator.goingDownIndicator(true);
      }
    },

    reset: function(elevator){
      var that = this;
      if(that.tempQueue.length > 0){
        that.addNextQueueItemToElevator(elevator);
      } else {
        elevator.goToFloor(0);
      };
    },

    floorNumInTempQueue: function(floorNum){
      var that = this;
      return this.floorNumInQueue(that.tempQueue, floorNum);
    },

    floorNumInElevatorQueue: function(elevator, floorNum){
      return this.floorNumInQueue(elevator.destinationQueue, floorNum);
    },

    floorNumInQueue: function(queue, floorNum){
      return (queue.indexOf(floorNum) > -1)
    },

    addFloorNumToElevatorQueue: function(elevator, floorNum){
      if(!this.floorNumInElevatorQueue(elevator, floorNum)){
        elevator.destinationQueue.push(floorNum);
      };
    },

    addFloorNumToElevatorQueueImmidiately: function(elevator, floorNum){
      if(!this.floorNumInElevatorQueue(elevator, floorNum)){
        elevator.destinationQueue.unshift(floorNum);
      };
    },

    addFloorNumToElevatorQueueAndSend: function(elevator, floorNum, now){
      if(now === undefined){
        this.addFloorNumToElevatorQueue(elevator, floorNum);
        elevator.destinationQueue.sort();
      } else {
        this.addFloorNumToElevatorQueueImmidiately(elevator, floorNum);
      }
      setTimeout(function(){
        elevator.checkDestinationQueue();
      }, 1000);
    },

    transferFloorNumFromTempQueueToElevator: function(floorNum, queue, elevator, now){
      var index = queue.indexOf(floorNum);
      var floorNumFromQueue = queue.splice(index,1)[0];
      this.addFloorNumToElevatorQueueAndSend(elevator, floorNumFromQueue, now);
    },

    addNextQueueItemToElevator: function(elevator){
      var nextQueueItem = this.tempQueue.splice(0,1)[0];
      this.addFloorNumToElevatorQueueAndSend(elevator, nextQueueItem);
    },

    setFloorHandlers: function(){
      var that = this;
      var i = 0;
      for(i < 0; i < that.floors.length; i++) {
        that.setFloorObserver(that.floors[i]);
      };
    },

    setFloorObserver: function(floor) {
      var that = this;
      floor.on("up_button_pressed", function() {
        if(!that.floorNumInTempQueue(floor.floorNum())){
          that.tempQueue.push(floor.floorNum());
        }
      });

      floor.on("down_button_pressed", function() {
        //if(!that.floorNumInTempQueue(floor.floorNum())){
          that.tempQueue.push(floor.floorNum());
        //}
      });
    },

    update: function(dt, elevators, floors) {
      // We normally don't need to do anything here
    }
}