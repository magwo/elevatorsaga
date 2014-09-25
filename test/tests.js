



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
});