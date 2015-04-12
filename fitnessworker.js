importScripts("libs/lodash.min.js", "libs/riot.js", "libs/unobservable.js")
importScripts("base.js", "movable.js", "floor.js", "user.js", "elevator.js", "interfaces.js", "world.js", "fitness.js");


onmessage = function(msg) {
    // Assume it is a code object that should be fitness-tested
    var codeStr = msg.data;
    var results = doFitnessSuite(codeStr, 6);
    console.log("Posting message back", results);
    postMessage(results);
};