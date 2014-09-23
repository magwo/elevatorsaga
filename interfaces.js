


// Interface that hides actual elevator object behind a more robust facade,
// while also exposing relevant events, and providing some helper queue
// functions that allow programming without async logic.
var asElevatorInterface = function(obj, elevator, floorCount) {
    riot.observable(obj);

    var taskQueue = [];

    var createTask = function(fn) {
        var task = { state: "waiting", fn: fn };
        task.setDone = function() { task.state = "done"; obj.pumpTaskQueue(); };
        task.isDone = function() { return task.state === "done"; }
        task.isWaiting = function() { return task.state === "waiting"; }
        task.start = function() { task.state = "ongoing"; task.fn(task); }
        return task;
    };

    obj.clearTaskQueue = function() {
        if(taskQueue.length) {
            taskQueue = [_.first(taskQueue)];
        }
    }

    obj.pumpTaskQueue = function () {
        var currentTask = _.first(taskQueue);
        if(typeof currentTask !== "undefined") {
            if(currentTask.isWaiting()) {
                currentTask.start();
            }
            if(currentTask.isDone()) {
                taskQueue = _.rest(taskQueue);
                obj.pumpTaskQueue();
            }
        } else {
            obj.trigger("idle");
        }
    }

    obj.goToFloor = function(floorNum) {
        floorNum = limitNumber(floorNum, 0, floorCount - 1);
        var task = createTask(function (taskObj) {
            elevator.goToFloor(floorNum, function() {
                elevator.wait(1000, function() {
                    taskObj.setDone();
                });
            });
        });
        task.destinationFloor = floorNum;
        _.each(taskQueue, function(t) {
            if(typeof t.destinationFloor !== "undefined") {
                if(t.destinationFloor === task.destinationFloor) {
                    task = null;
                    return false;
                }
            }
        });
        if(task) {
            taskQueue.push(task);
            obj.pumpTaskQueue();
        }
    }


    obj.getFirstPressedFloor = function() { return elevator.getFirstPressedFloor(); }
    elevator.on("floor_button_pressed", function(floorNum) {
        obj.trigger("floor_button_pressed", floorNum);
    });

    return obj;
}