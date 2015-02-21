{
  name: 'Global Scheduler solution (v 1.0)',
  url: 'https://github.com/magwo/elevatorsaga/wiki/Ariel%27s-Global-Scheduler',
  scheduler: null,

  init: function(elevators, floors) {
    var log = function() {
      //console.log(Array.prototype.slice.call(arguments));
    };

    /* Assign an elevator this new request */
    var assignElevator = function(req) {
      var minPlan = null;
      var minElev = null;
      for (var i = 0; i < elevators.length; i++) {
        var elevator = elevators[i];
        var theoreticalRequests = elevator.allRequests().slice();
        theoreticalRequests.push(req);
        var plan = elevator.navigationPlan(elevator.currentFloor(), elevator.loadFactor(), theoreticalRequests);

        if (minElev == null) {
          minPlan = plan;
          minElev = elevator;
        } else if (plan.cost < minPlan.cost) {
          minPlan = plan;
          minElev = elevator;
        }
      }
      minElev.addCallRequest(req);
      log("<<<<<<< Assigned ", req, " to elevator " + minElev._id + " >>>>>>>>>");
      // TODO: On new floor or call requests, the elevator should offer up old call requests just in case there are more optimal divisions of labor.
      // TODO: Model floor request likelyhood
    };

    /* Call request object */
    var callRequest = function(floor, isUp) {
      return {
        callRequest: true,
        up: isUp,
        down: !isUp,
        destFloor: floor.floorNum(),
        startTime: (+new Date())
      };
    };

    /* Listen for floor button pushes */
    for (var i = 0; i < floors.length; i++) {
      (function(floor) {
        floor.on('up_button_pressed', function() {
          var request = new callRequest(this, true);
          assignElevator(request);
        });
        floor.on('down_button_pressed', function() {
          var request = new callRequest(this, false);
          assignElevator(request);
        });
      })(floors[i]);
    }

    /* Floor request object */
    var floorRequest = function(num) {
      return {
        floorRequest: true,
        destFloor: num,
        startTime: (+new Date())
      };
    };

    var Node = function(state) {
      var obj = {};
      for (var attr in state) {
        obj[attr] = state[attr];
      }
      return obj;
    };

    /* ELEVATOR MIXINS */
    for (var i = 0; i < elevators.length; i++) {
      (function(elevator) {
        elevator._id = i;

        elevator.deferredPlans = null;
        elevator.floorRequests = [];
        elevator.callRequests = [];

        elevator.prioritize = function() {
          // Optimal personal plan using current requests
          var requests = this.allRequests();
          var plan = this.navigationPlan(this.currentFloor(), this.loadFactor(), requests);

          log("-------ELEVATOR[" + this._id+ "]----------");
          log("REQUESTS", requests);
          log("PLAN", plan);

          this.deferredPlans = plan.path;
        };

        elevator.allRequests = function() {
          var requests = [];
          for (var i = 0; i < this.floorRequests.length; i++) {
            requests.push(this.floorRequests[i]);
          }
          for (var i = 0; i < this.callRequests.length; i++) {
            requests.push(this.callRequests[i]);
          }
          // reduce duplicates or invalids
          for (var i = 0; i < requests.length; i++) {
            if (requests[i].destFloor == this.currentFloor()) {
              requests.splice(i, 1);
              i--;
              continue;
            }
            for (var j = i + 1; j < requests.length; j++) {
              if (requests[i].destFloor == requests[j].destFloor) {
                requests.splice(j, 1);
                j--;
                continue;
              }
            }
          }
          return requests;
        };

        elevator.addFloorRequest = function(req) {
          this.floorRequests.push(req);
          this.prioritize();
        };

        elevator.addCallRequest = function(req) {
          this.callRequests.push(req);
          this.prioritize();
        };

        elevator.serviceRequests = function(floorNum) {
          // Remove floor requests
          for (var i = 0; i < this.floorRequests.length; i++) {
            var floorRequest = this.floorRequests[i];
            if (floorRequest.destFloor == floorNum) {
              this.floorRequests.splice(i,1);
              i--;
            }
          }
          // Remove call requests
          for (var i = 0; i < this.callRequests.length; i++) {
            var callRequest = this.callRequests[i];
            if (callRequest.destFloor == floorNum) {
              this.callRequests.splice(i, 1);
              i--;
            }
          }
        };

        elevator.navigationPlan = function(currentFloor, currentLoad, allRequests) {
          // Grab necessary local methods
          var estimatedTravelTime = this.estimatedTravelTime;
          var maxClientWaitTime = this.maxClientWaitTime;
          var minLeaf = null;

          // Create a navigation graph
          var root = new Node({
            floor: currentFloor,
            requests: allRequests,
            estimatedLoad: currentLoad,
            estimatedTime: (+new Date()),
            parent: null,
            cost: 0
          });

          // Recursive construction
          var stepLayer = function(current) {
            var requests = current.requests;

            if (requests.length == 0) {
              if (minLeaf === null) {
                minLeaf = current;
              } else if (current.cost < minLeaf.cost) {
                minLeaf = current;
              }
              return;
            }

            for (var i = 0; i < requests.length; i++) {
              var request = requests[i];

              var pathTime = estimatedTravelTime(current.floor, request.destFloor);
              var maxWaitTime = maxClientWaitTime(current.estimatedTime, requests);
              var deltaCost = pathTime + Math.pow(maxWaitTime/4.0, 2);

              var deltaLoad = 0;
              // TODO: make an adaptive load model
              if (request.floorRequest) {
                deltaLoad -= 0.3;
              } else if (request.callRequest) {
                deltaLoad += 0.25;
              }
              var nextLoad = current.estimatedLoad + deltaLoad;
              if (nextLoad > 1) {
                nextLoad = 1;
              } else if (nextLoad < 0) {
                nextLoad = 0;
              }
              deltaCost += 5 * (nextLoad - 0.5) * (nextLoad - 0.5);

              var otherRequests = requests.slice();
              otherRequests.splice(i, 1);

              var node = new Node({
                floor: request.destFloor,
                requests: otherRequests.slice(),
                estimatedLoad: current.estimatedLoad + deltaLoad,
                estimatedTime: current.estimatedTime + pathTime * 1000.0,
                parent: current,
                cost: current.cost + deltaCost
              });

              stepLayer(node);
            }
          };
          stepLayer(root);

          // No requests
          if (minLeaf == null) {
            return {
              path: [],
              cost: 9999999,
            };
          }

          // Backtrace
          var path = [];
          var cost = minLeaf.cost;
          while (minLeaf != null) {
            path.push(minLeaf.floor);
            minLeaf = minLeaf.parent;
          }
          path.reverse();
          if (path[0] == currentFloor) {
            path.splice(0,1);
          }

          return {
            path: path,
            cost: cost
          };
        };

        elevator.estimatedTravelTime = function(from, to) {
          return Math.abs(from-to) * 0.5;
        };

        elevator.maxClientWaitTime = function(estimatedTime, requests) {
          var maxTime = 0;
          for (var i = 0; i < requests.length; i++) {
            if (requests[i].callRequest) {
              var diff = estimatedTime - requests[i].startTime;
              if (diff > maxTime) {
                maxTime = diff;
              }
            }
          }
          return maxTime / 1000.0;
        };

        elevator.on('idle', function() {
          this.prioritize();
          this.goToFloor(this.currentFloor());
        });

        elevator.on('floor_button_pressed', function(num) {
          this.addFloorRequest(new floorRequest(num));
          this.prioritize();
        });

        elevator.on('passing_floor', function(num, dir) {
          this.prioritize();
        });

        elevator.on('stopped_at_floor', function(num) {
          this.serviceRequests(num);
          this.prioritize();

          // Queue maneuvers
          if (this.deferredPlans) {
            elevator.destinationQueue = this.deferredPlans;
            elevator.checkDestinationQueue();
            this.deferredPlans = null;
          }

          // Mission planner throwback
          if (this.loadFactor() > 0.5) {
            var callRequests = this.callRequests.slice();
            this.callRequests = [];
            for (var i = 0; i < callRequests.length; i++) {
              assignElevator(callRequests[i]);
            }
          }
        });
      })(elevators[i]);
    }
  },

  update: function(dt, elevators, floors) {
  }
}