

var timeForwarder = function(dt, stepSize, fn) {
	var accumulated = 0.0;
	while(accumulated < dt) {
		accumulated += stepSize;
		fn(stepSize);
	}
};

describe("Movable class", function() {
	var m = null;
	var movableHandlers = null;

	beforeEach(function() {
		m = new Movable();
		movableHandlers = {
			someHandler: function() {}
		};
		spyOn(movableHandlers, "someHandler").and.callThrough();
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
	var handlers = null;

	beforeEach(function() {
		u = new User();
		handlers = {
			someHandler: function() {},
		};
		spyOn(handlers, "someHandler").and.callThrough();
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
	var movableHandlers = null;

	beforeEach(function() {
		m = new Movable();
		movableHandlers = {
			someHandler: function() {},
		};
		spyOn(movableHandlers, "someHandler").and.callThrough();
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
		m.on("new_state", movableHandlers.someHandler);
		m.moveTo(1.0, 1.0);
		expect(movableHandlers.someHandler).toHaveBeenCalled();
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
		m.moveToOverTime(2.0, 3.0, 10.0, movableHandlers.someHandler);
		timeForwarder(10.0, 0.1, function(dt) { m.update(dt) });
		expect(m.x).toBe(2.0);
		expect(m.y).toBe(3.0);
		expect(movableHandlers.someHandler).toHaveBeenCalled();
	});
});

describe("World controller", function() {
	var controller = null;
	var fakeWorld = null;
	var fakeCodeObj = null;
	var frameRequester = null;
	var DT_MAX = 1000.0 / 59;
	var createFrameRequester = function(timeStep) {
		var currentT = 0.0;
		var currentCb = null;
		return {
			register: function(cb) { currentCb = cb; },
			trigger: function() { currentT += timeStep; if(currentCb !== null) { currentCb(currentT); } }
		};
	};
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

describe("Promise object", function() {
	var handlers = null;
	var p = null;

	beforeEach(function() {
		p = new Promise();
		handlers = {
			someHandler: function() {},
			otherHandler: function() {},
			thirdHandler: function() {}
		};
		$.each(handlers, function(key, value) {
			spyOn(handlers, key).and.callThrough();
		});
	});

	it("can resolve to done without handlers", function() {
		expect(p.done).not.toThrow();
		expect(p.resolution).toBe("done");
	});
	it("can resolve to fail without handlers", function() {
		expect(p.fail).not.toThrow();
		expect(p.resolution).toBe("fail");
	});
	it("can resolve to done with argument", function() {
		p.done(handlers.someHandler);
		p.always(handlers.otherHandler);
		p.done("pew");
		expect(handlers.someHandler).toHaveBeenCalledWith("pew");
		expect(handlers.otherHandler).toHaveBeenCalledWith("pew");
	});
	it("calls done handler after done", function() {
		p.done(handlers.someHandler);
		p.done();
		expect(handlers.someHandler).toHaveBeenCalled();
	});
	it("calls fail handler after fail", function() {
		p.fail(handlers.someHandler);
		p.fail();
		expect(handlers.someHandler).toHaveBeenCalled();
	});
	it("calls always handler after done", function() {
		p.always(handlers.someHandler);
		p.done();
		expect(handlers.someHandler).toHaveBeenCalled();
	});
	it("calls always handler after fail", function() {
		p.always(handlers.someHandler);
		p.fail();
		expect(handlers.someHandler).toHaveBeenCalled();
	});
	it("doesnt call done handler on fail", function() {
		p.done(handlers.someHandler);
		p.fail();
		expect(handlers.someHandler).not.toHaveBeenCalled();
	});
	it("doesnt call fail handler on done", function() {
		p.fail(handlers.someHandler);
		p.done();
		expect(handlers.someHandler).not.toHaveBeenCalled();
	});
	it("doesnt allow multiple done resolution", function() {
		p.done(handlers.someHandler);
		p.done();
		expect(p.done).toThrow();
	});
	it("doesnt allow multiple fail resolution", function() {
		p.fail();
		expect(p.fail).toThrow();
	});
	it("doesnt allow fail then done resolution", function() {
		p.fail();
		expect(p.done).toThrow();
	});
	it("calls multiply registered handlers repeatedly", function() {
		var count = 0;
		var counterFunc = function() { count++; };
		p.done(counterFunc);
		p.done(counterFunc);
		p.done();
		expect(count).toBe(2);
	});
	it("supports chaining of handler registration", function() {
		p.done(handlers.someHandler).done(handlers.otherHandler).always(handlers.thirdHandler);
		p.done();
		expect(handlers.someHandler).toHaveBeenCalled();
		expect(handlers.otherHandler).toHaveBeenCalled();
		expect(handlers.thirdHandler).toHaveBeenCalled();
	});
	it("calls handlers with argument even if registered after resolution", function() {
		p.done("moo");
		p.done(handlers.someHandler).fail(handlers.thirdHandler);
		p.always(handlers.otherHandler);
		expect(handlers.someHandler).toHaveBeenCalledWith("moo");
		expect(handlers.otherHandler).toHaveBeenCalledWith("moo");
		expect(handlers.thirdHandler).not.toHaveBeenCalled();
	});
});

describe("Elevator object", function() {
	var e = null;
	var floorCount = 4;
	var floorHeight = 44;

	beforeEach(function() {
		e = new Elevator(1.5, floorCount, floorHeight);
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
		e.moveTo(0, 0);
		e.setFloorPosition(0);
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
		e.moveTo(0, 0);
		e.setFloorPosition(0);
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
});


describe("API", function() {
	var handlers = null;

	beforeEach(function() {
		handlers = {
			someHandler: function() {},
		};
		$.each(handlers, function(key, value) {
			spyOn(handlers, key).and.callThrough();
		});
	});

	describe("Elevator interface", function() {
		var e = null;
		var elevInterface = null;
		beforeEach(function() {
			e =  new Elevator(1.5, 4, 40);
			e.setFloorPosition(0);
			elevInterface = asElevatorInterface({}, e, 4);
		});
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
	});
});
