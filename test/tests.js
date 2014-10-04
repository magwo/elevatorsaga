


describe("Movable object", function() {
	var m = null;
	var movableHandlers = null;
	var timeForwarder = function(dt, stepSize, fn) {
		var accumulated = 0.0;
		while(accumulated < dt) {
			accumulated += stepSize;
			fn(stepSize);
		}
	};
	beforeEach(function() {
		m = asMovable({});
		movableHandlers = {
			someHandler: function() {},
		}
		spyOn(movableHandlers, "someHandler").and.callThrough();
	});

	it("updates display position when told to", function() {
		m.setPosition([1.0, 1.0]);
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
		var mParent = asMovable({});
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
		timeForwarder(10.0, 0.1, m.update);
		expect(m.x).toBe(2.0);
		expect(m.y).toBe(3.0);
		expect(movableHandlers.someHandler).toHaveBeenCalled();
	});
	it("moves physically to destination over time", function() {
		//obj.movePhysically = function(newX, newY, constantAcceleration, constantDeceleration, maxSpeed, cb) {
		m.movePhysically(2.0, 3.0, 1.0, 2.0, 5.0, movableHandlers.someHandler);
		timeForwarder(10.0, 0.1, m.update);
		expect(m.x).toBe(2.0);
		expect(m.y).toBe(3.0);
		expect(movableHandlers.someHandler).toHaveBeenCalled();
	});
});

describe("World controller", function() {
	var controller = null;
	var fakeWorld = null;
	var frameRequester = null;
	var DT_MAX = 1000.0 / 59;
	var createFrameRequester = function(timeStep) {
		var currentT = 0.0;
		var currentCb = null;
		return {
			register: function(cb) { currentCb = cb; },
			trigger: function() { currentT += timeStep; if(currentCb !== null) { currentCb(currentT); } }
		};
	}
	beforeEach(function() {
		controller = createWorldController(DT_MAX);
		fakeWorld = { update: function(dt) { console.log("fake with dt", dt)} };
		frameRequester = createFrameRequester(10.0);
		spyOn(fakeWorld, "update").and.callThrough();
	});
	it("does not update world on first animation frame", function() {
		controller.start(fakeWorld, frameRequester.register);
		frameRequester.trigger();
		expect(fakeWorld.update).not.toHaveBeenCalled();
	});
	it("calls world update with correct delta t", function() {
		controller.start(fakeWorld, frameRequester.register);
		frameRequester.trigger();
		frameRequester.trigger();
		expect(fakeWorld.update).toHaveBeenCalledWith(0.01);
	});
	it("calls world update with scaled delta t", function() {
		controller.timeScale = 2.0;
		controller.start(fakeWorld, frameRequester.register);
		frameRequester.trigger();
		frameRequester.trigger();
		expect(fakeWorld.update).toHaveBeenCalledWith(0.02);
	});
	it("does not update world when paused", function() {
		controller.start(fakeWorld, frameRequester.register);
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
		}
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
		p.always(handlers.otherHandler)
		expect(handlers.someHandler).toHaveBeenCalledWith("moo");
		expect(handlers.otherHandler).toHaveBeenCalledWith("moo");
		expect(handlers.thirdHandler).not.toHaveBeenCalled();
	});
});