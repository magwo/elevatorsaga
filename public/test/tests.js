

var timeForwarder = function(dt, stepSize, fn) {
	var accumulated = 0.0;
	while(accumulated < dt) {
		accumulated += stepSize;
		fn(stepSize);
	}
};

describe("Elevator Saga", function() {

	var handlers = null;
	beforeEach(function() {
		handlers = {
			someHandler: function() { },
			someOtherHandler: function() { }
		};
		$.each(handlers, function(key, value) {
			spyOn(handlers, key).and.callThrough();
		});
	});

	describe("Movable class", function() {
		var m = null;

		beforeEach(function() {
			m = new Movable();
		});
		it("disallows incorrect creation", function() {
			var faultyCreation = function () { Movable(); };
			expect(faultyCreation).toThrow();
		});
		it("updates display position when told to", function() {
			m.moveTo(1.0, 1.0);
			m.updateDisplayPosition();
			expect(m.worldX).toBe(1.0);
			expect(m.worldY).toBe(1.0);
		});
	});

	describe("User class", function() {
		var u = null;

		beforeEach(function() {
			u = new User();
		});
		it("updates display position when told to", function() {
			u.moveTo(1.0, 1.0);
			u.updateDisplayPosition();
			expect(u.worldX).toBe(1.0);
			expect(u.worldY).toBe(1.0);
		});
	});

	describe("Movable object", function() {
		var m = null;

		beforeEach(function() {
			m = new Movable();
		});

		it("updates display position when told to", function() {
			m.moveTo(1.0, 1.0);
			m.updateDisplayPosition();
			expect(m.worldX).toBe(1.0);
			expect(m.worldY).toBe(1.0);
		});
		it("does not update display position when moved", function() {
			m.moveTo(1.0, 1.0);
			expect(m.worldX).toBe(0.0);
			expect(m.worldY).toBe(0.0);
		});
		it("triggers event when moved", function() {
			m.on("new_state", handlers.someHandler);
			m.moveTo(1.0, 1.0);
			expect(handlers.someHandler).toHaveBeenCalled();
		});
		it("retains x pos when moveTo x is null", function() {
			m.moveTo(1.0, 1.0);
			m.moveTo(null, 2.0);
			expect(m.x).toBe(1.0);
		});
		it("retains y pos when moveTo y is null", function() {
			m.moveTo(1.0, 1.0);
			m.moveTo(2.0, null);
			expect(m.y).toBe(1.0);
		});
		it("gets new display position when parent is moved", function() {
			var mParent = new Movable();
			m.setParent(mParent);
			mParent.moveTo(2.0, 3.0);
			m.updateDisplayPosition();
			expect(m.x).toBe(0.0);
			expect(m.y).toBe(0.0);
			expect(m.worldX).toBe(2.0);
			expect(m.worldY).toBe(3.0);
		});
		it("moves to destination over time", function() {
			//obj.moveToOverTime = function(newX, newY, timeToSpend, interpolator, cb) {
			m.moveToOverTime(2.0, 3.0, 10.0, handlers.someHandler);
			timeForwarder(10.0, 0.1, function(dt) { m.update(dt) });
			expect(m.x).toBe(2.0);
			expect(m.y).toBe(3.0);
			expect(handlers.someHandler).toHaveBeenCalled();
		});
	});

	describe("World controller", function() {
		var controller = null;
		var fakeWorld = null;
		var fakeCodeObj = null;
		var frameRequester = null;
		var DT_MAX = 1000.0 / 59;
		beforeEach(function() {
			controller = createWorldController(DT_MAX);
			fakeWorld = { update: function(dt) {}, init: function() {}, updateDisplayPositions: function() {}, trigger: function() {} };
			fakeWorld = riot.observable(fakeWorld);
			fakeCodeObj = { init: function() {}, update: function() {} };
			frameRequester = createFrameRequester(10.0);
			spyOn(fakeWorld, "update").and.callThrough();
		});
		it("does not update world on first animation frame", function() {
			controller.start(fakeWorld, fakeCodeObj, frameRequester.register, true);
			frameRequester.trigger();
			expect(fakeWorld.update).not.toHaveBeenCalled();
		});
		it("calls world update with correct delta t", function() {
			controller.start(fakeWorld, fakeCodeObj, frameRequester.register, true);
			frameRequester.trigger();
			frameRequester.trigger();
			expect(fakeWorld.update).toHaveBeenCalledWith(0.01);
		});
		it("calls world update with scaled delta t", function() {
			controller.timeScale = 2.0;
			controller.start(fakeWorld, fakeCodeObj, frameRequester.register, true);
			frameRequester.trigger();
			frameRequester.trigger();
			expect(fakeWorld.update).toHaveBeenCalledWith(0.02);
		});
		it("does not update world when paused", function() {
			controller.start(fakeWorld, fakeCodeObj, frameRequester.register, true);
			controller.isPaused = true;
			frameRequester.trigger();
			frameRequester.trigger();
			expect(fakeWorld.update).not.toHaveBeenCalled();
		});
	});


	describe("Challenge requirements", function() {
		var fakeWorld = null;
		beforeEach(function() {
			fakeWorld = { elapsedTime: 0.0, transportedCounter: 0, maxWaitTime: 0.0, moveCount: 0 };
		});

		describe("requireUserCountWithinTime", function (){
			it("evaluates correctly", function() {
				var challengeReq = requireUserCountWithinTime(10, 5.0);
				expect(challengeReq.evaluate(fakeWorld)).toBe(null);
				fakeWorld.elapsedTime = 5.1;
				expect(challengeReq.evaluate(fakeWorld)).toBe(false);
				fakeWorld.transportedCounter = 11;
				expect(challengeReq.evaluate(fakeWorld)).toBe(false);
				fakeWorld.elapsedTime = 4.9;
				expect(challengeReq.evaluate(fakeWorld)).toBe(true);
			});
		});
		describe("requireUserCountWithMaxWaitTime", function (){
			it("evaluates correctly", function() {
				var challengeReq = requireUserCountWithMaxWaitTime(10, 4.0);
				expect(challengeReq.evaluate(fakeWorld)).toBe(null);
				fakeWorld.maxWaitTime = 4.5;
				expect(challengeReq.evaluate(fakeWorld)).toBe(false);
				fakeWorld.transportedCounter = 11;
				expect(challengeReq.evaluate(fakeWorld)).toBe(false);
				fakeWorld.maxWaitTime = 3.9;
				expect(challengeReq.evaluate(fakeWorld)).toBe(true);
			});
		});
		describe("requireUserCountWithinMoves", function (){
			it("evaluates correctly", function() {
				var challengeReq = requireUserCountWithinMoves(10, 20);
				expect(challengeReq.evaluate(fakeWorld)).toBe(null);
				fakeWorld.moveCount = 21;
				expect(challengeReq.evaluate(fakeWorld)).toBe(false);
				fakeWorld.transportedCounter = 11;
				expect(challengeReq.evaluate(fakeWorld)).toBe(false);
				fakeWorld.moveCount = 20;
				expect(challengeReq.evaluate(fakeWorld)).toBe(true);
			});
		});
	        describe("requireUserCountWithinTimeWithMaxWaitTime", function(){
	                it("evaluates correctly", function() {
	                        var challengeReq = requireUserCountWithinTimeWithMaxWaitTime(10, 5.0, 4.0);
	                        expect(challengeReq.evaluate(fakeWorld)).toBe(null);
	                        fakeWorld.elapsedTime = 5.1;
	                        expect(challengeReq.evaluate(fakeWorld)).toBe(false);
	                        fakeWorld.transportedCounter = 11;
	                        expect(challengeReq.evaluate(fakeWorld)).toBe(false);
	                        fakeWorld.elapsedTime = 4.9;
	                        expect(challengeReq.evaluate(fakeWorld)).toBe(true);
	                        fakeWorld.maxWaitTime = 4.1;
	                        expect(challengeReq.evaluate(fakeWorld)).toBe(false);
	                });
	        });
	});

	describe("Elevator object", function() {
		var e = null;
		var floorCount = 4;
		var floorHeight = 44;

		beforeEach(function() {
			e = new Elevator(1.5, floorCount, floorHeight);
			e.setFloorPosition(0);
		});

		it("moves to floors specified", function() {
			_.each(_.range(0, floorCount-1), function(floor) {
				e.goToFloor(floor);
				timeForwarder(10.0, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
				var expectedY = (floorHeight * (floorCount-1)) - floorHeight*floor;
				expect(e.y).toBe(expectedY);
				expect(e.currentFloor).toBe(floor, "Floor num");
			});
		});

		it("can change direction", function() {
			expect(e.currentFloor).toBe(0);
			var originalY = e.y;
			e.goToFloor(1);
			timeForwarder(0.2, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
			expect(e.y).not.toBe(originalY);
			e.goToFloor(0);
			timeForwarder(10.0, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
			expect(e.y).toBe(originalY);
			expect(e.currentFloor).toBe(0);
		});

		it("is correctly aware of it being on a floor", function() {
			expect(e.isOnAFloor()).toBe(true);
			e.y = e.y + 0.0000000000000001;
			expect(e.isOnAFloor()).toBe(true);
			e.y = e.y + 0.0001;
			expect(e.isOnAFloor()).toBe(false);
		});

		it("correctly reports travel suitability", function() {
			e.goingUpIndicator = true;
			e.goingDownIndicator = true;
			expect(e.isSuitableForTravelBetween(0, 1)).toBe(true);
			expect(e.isSuitableForTravelBetween(2, 4)).toBe(true);
			expect(e.isSuitableForTravelBetween(5, 3)).toBe(true);
			expect(e.isSuitableForTravelBetween(2, 0)).toBe(true);
			e.goingUpIndicator = false;
			expect(e.isSuitableForTravelBetween(1, 10)).toBe(false);
			e.goingDownIndicator = false;
			expect(e.isSuitableForTravelBetween(20, 0)).toBe(false);
		});

		it("reports pressed floor buttons", function() {
			e.pressFloorButton(2);
			e.pressFloorButton(3);
			expect(e.getPressedFloors()).toEqual([2,3]);
		});


		it("reports not approaching floor 0 when going up from floor 0", function() {
			e.goToFloor(1);
			timeForwarder(0.01, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
			expect(e.isApproachingFloor(0)).toBe(false);
		});

		it("reports approaching floor 2 when going up from floor 0", function() {
			e.goToFloor(1);
			timeForwarder(0.01, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
			expect(e.isApproachingFloor(2)).toBe(true);
		});

		it("reports approaching floor 2 when going down from floor 3", function() {
			e.setFloorPosition(3);
			e.goToFloor(2);
			timeForwarder(0.01, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
			expect(e.isApproachingFloor(2)).toBe(true);
		});

		it("emits no passing floor events when going from floor 0 to 1", function() {
			e.on("passing_floor", handlers.someHandler);
			e.on("passing_floor", function(floorNum, direction) {
				console.log("Passing floor yo", floorNum, direction);
			});
			e.goToFloor(1);
			timeForwarder(10.0, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
			expect(e.currentFloor).toBe(1);
			expect(handlers.someHandler).not.toHaveBeenCalled();
		});
		it("emits passing floor event when going from floor 0 to 2", function() {
			e.on("passing_floor", handlers.someHandler);
			e.goToFloor(2);
			timeForwarder(10.0, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
			expect(e.currentFloor).toBe(2);
			expect(handlers.someHandler.calls.count()).toEqual(1);
			expect(handlers.someHandler.calls.mostRecent().args.slice(0, 1)).toEqual([1]);
		});
		it("emits passing floor events when going from floor 0 to 3", function() {
			e.on("passing_floor", handlers.someHandler);
			e.goToFloor(3);
			timeForwarder(10.0, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
			expect(e.currentFloor).toBe(3);
			expect(handlers.someHandler.calls.count()).toEqual(2);
			expect(handlers.someHandler.calls.argsFor(0).slice(0, 1)).toEqual([1]);
			expect(handlers.someHandler.calls.argsFor(1).slice(0, 1)).toEqual([2]);
		});
		it("emits passing floor events when going from floor 3 to 0", function() {
			e.on("passing_floor", handlers.someHandler);
			e.goToFloor(3);
			timeForwarder(10.0, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
			expect(e.currentFloor).toBe(3);
			expect(handlers.someHandler.calls.count()).toEqual(2);
			expect(handlers.someHandler.calls.argsFor(0).slice(0, 1)).toEqual([1]);
			expect(handlers.someHandler.calls.argsFor(1).slice(0, 1)).toEqual([2]);
		});
		it("doesnt raise unexpected events when told to stop(ish) when passing floor", function() {
			var passingFloorEventCount = 0;
			e.on("passing_floor", function(floorNum, direction) {
				expect(floorNum).toBe(1, "floor being passed");
				expect(direction).toBe("up");
				passingFloorEventCount++;
				e.goToFloor(e.getExactFutureFloorIfStopped());
			});
			e.goToFloor(2);
			timeForwarder(3.0, 0.01401, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
			expect(passingFloorEventCount).toBeGreaterThan(0, "event count");
			expect(e.getExactCurrentFloor()).toBeLessThan(1.15, "current floor");
		});

		it("doesnt seem to overshoot when stopping at floors", function() {
			_.each(_.range(60, 120, 2.32133), function(updatesPerSecond) {
				var STEPSIZE = 1.0 / updatesPerSecond;
				e.setFloorPosition(1);
				e.goToFloor(3);
				timeForwarder(5.0, STEPSIZE, function(dt) {
					e.update(dt);
					e.updateElevatorMovement(dt);
					expect(e.getExactCurrentFloor()).toBeWithinRange(1.0, 3.0, "(STEPSIZE is " + STEPSIZE + ")");
				});
				expect(e.getExactCurrentFloor()).toEqual(3.0);
			});


		});

	});


	describe("API", function() {
		describe("Elevator interface", function() {
			var e = null;
			var elevInterface = null;
			beforeEach(function() {
				e =  new Elevator(1.5, 4, 40);
				e.setFloorPosition(0);
				elevInterface = asElevatorInterface({}, e, 4);
			});

			describe("events", function() {
				it("propagates stopped_at_floor event", function() {
					elevInterface.on("stopped_at_floor", handlers.someHandler);
					e.trigger("stopped_at_floor", 3);
					expect(handlers.someHandler.calls.mostRecent().args.slice(0, 1)).toEqual([3]);
				});

				it("does not propagate stopped event", function() {
					elevInterface.on("stopped", handlers.someHandler);
					e.trigger("stopped", 3.1);
					expect(handlers.someHandler).not.toHaveBeenCalled();
				});

				it("triggers idle event at start", function() {
					elevInterface.on("idle", handlers.someHandler);
					elevInterface.checkDestinationQueue();
					expect(handlers.someHandler).toHaveBeenCalled();
				});

				it("triggers idle event when queue empties", function() {
					elevInterface.on("idle", handlers.someHandler);
					elevInterface.destinationQueue = [11, 21];
					e.y = 11;
					e.trigger("stopped", e.y);
					expect(handlers.someHandler).not.toHaveBeenCalled();
					e.y = 21;
					e.trigger("stopped", e.y);
					expect(handlers.someHandler).toHaveBeenCalled();
				});
			});

			it("stops when told told to stop", function() {
				var originalY = e.y;
				elevInterface.goToFloor(2);
				timeForwarder(10, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
				expect(e.y).not.toBe(originalY);

				elevInterface.goToFloor(0);
				timeForwarder(0.2, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
				var whenMovingY = e.y;

				elevInterface.stop();
				timeForwarder(10, 0.015, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
				expect(e.y).not.toBe(whenMovingY);
				expect(e.y).not.toBe(originalY);
			});

			describe("destination direction", function() {
				it("reports up when going up", function() {
					e.setFloorPosition(1);
					elevInterface.goToFloor(1);
					expect(elevInterface.destinationDirection()).toBe("stopped");
				});
				it("reports up when going up", function() {
					elevInterface.goToFloor(1);
					expect(elevInterface.destinationDirection()).toBe("up");
				});
				it("reports down when going down", function() {
					e.setFloorPosition(3);
					elevInterface.goToFloor(2);
					expect(elevInterface.destinationDirection()).toBe("down");
				});
			});

			it("stores going up and going down properties", function() {
				expect(e.goingUpIndicator).toBe(true);
				expect(e.goingDownIndicator).toBe(true);
				expect(elevInterface.goingUpIndicator()).toBe(true);
				expect(elevInterface.goingDownIndicator()).toBe(true);

				elevInterface.goingUpIndicator(false);
				expect(elevInterface.goingUpIndicator()).toBe(false);
				expect(elevInterface.goingDownIndicator()).toBe(true);

				elevInterface.goingDownIndicator(false);
				expect(elevInterface.goingDownIndicator()).toBe(false);
				expect(elevInterface.goingUpIndicator()).toBe(false);
			});

			it("can chain calls to going up and down indicator functions", function() {
				elevInterface.goingUpIndicator(false).goingDownIndicator(false);
				expect(elevInterface.goingUpIndicator()).toBe(false);
				expect(elevInterface.goingDownIndicator()).toBe(false);
			});

			it("normalizes load factor", function() {
				var fnNewUser = function(){ return {weight:_.random(55, 100)}; },
					fnEnterElevator = function(user){ e.userEntering(user); };

				_.chain(_.range(20)).map(fnNewUser).forEach(fnEnterElevator);
				var load = elevInterface.loadFactor();
				expect(load >= 0 && load <= 1).toBeTruthy();
			});

			it("doesnt raise unexpected events when told to stop when passing floor", function() {
				e.setFloorPosition(2);
				elevInterface.goToFloor(0);
				var passingFloorEventCount = 0;
				elevInterface.on("passing_floor", function(floorNum, direction) {
					passingFloorEventCount++;
					// We only expect to be passing floor 1, but it is possible and ok that several
					// such events are raised, due to possible overshoot.
					expect(floorNum).toBe(1, "floor being passed");
					elevInterface.stop();
				});
				timeForwarder(3.0, 0.01401, function(dt) {e.update(dt); e.updateElevatorMovement(dt);});
				expect(passingFloorEventCount).toBeGreaterThan(0);
			});
		});
	});

	describe("base", function() {
		describe("getCodeObjFromCode", function() {
			var testCode = "{init: function init() {}, update: function update() {}}";
			it("handles trailing whitespace", function() {
				expect(getCodeObjFromCode(testCode + "\n")).toEqual(jasmine.any(Object));
			});
			it("handles prefix whitespace", function() {
				expect(getCodeObjFromCode("\n" + testCode)).toEqual(jasmine.any(Object));
			});
			it("handles prefix and trailing whitespace", function() {
				expect(getCodeObjFromCode("\n" + testCode + "\n")).toEqual(jasmine.any(Object));
			});
		});
	});
});
