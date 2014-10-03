
var requireUserCountWithinTime = function(userCount, timeLimit) {
    return {
        description: "Transport <span class='emphasis-color'>" + userCount + "</span> people in <span class='emphasis-color'>" + timeLimit.toFixed(0) + "</span> seconds or less",
        evaluate: function(world) {
            if(world.elapsedTime >= timeLimit || world.transportedCounter >= userCount) {
                return world.elapsedTime <= timeLimit && world.transportedCounter >= userCount;
            } else {
                return null;
            }
        }
    }
};

var requireUserCountWithMaxWaitTime = function(userCount, maxWaitTime) {
    return {
        description: "Transport <span class='emphasis-color'>" + userCount + "</span> people and let noone wait more than <span class='emphasis-color'>" + maxWaitTime.toFixed(0) + "</span> seconds",
        evaluate: function(world) {
            if(world.maxWaitTime >= maxWaitTime || world.transportedCounter >= userCount) {
                return world.maxWaitTime <= maxWaitTime && world.transportedCounter >= userCount;
            } else {
                return null;
            }
        }
    }
};

var requireUserCountWithinMoves = function(userCount, moveLimit) {
    return {
        description: "Transport <span class='emphasis-color'>" + userCount + "</span> people using <span class='emphasis-color'>" + moveLimit + "</span> elevator moves or less",
        evaluate: function(world) {
            if(world.moveCount >= moveLimit || world.transportedCounter >= userCount) {
                return world.moveCount <= moveLimit && world.transportedCounter >= userCount;
            } else {
                return null;
            }
        }
    }
};

var requireDemo = function() {
    return {
        description: "Perpetual demo",
        evaluate: function() { return null; }
    }
}

var createWeightedSelector = function(weights) {
    var sum = _.reduce(weights, function(sum, w) { return sum+w; }, 0.0);
    console.log("Sum is", sum);
    return function() {
        var num = _.random(sum, true);
        var summed = 0;
        var selectedIndex = 0;
        _.each(weights, function(w, i) { summed += w; if(num < summed) { selectedIndex = i; return false; } });
        return selectedIndex;
    }
}


var challenges = [
     {options: {floorCount: 3, elevatorCount: 1, spawnRate: 0.3}, condition: requireUserCountWithinTime(15, 60)}
    ,{options: {floorCount: 5, elevatorCount: 1, spawnRate: 0.4}, condition: requireUserCountWithinTime(20, 60)}
    ,{options: {floorCount: 4, elevatorCount: 2, spawnRate: 0.5}, condition: requireUserCountWithinTime(25, 60)}
    ,{options: {floorCount: 8, elevatorCount: 2, spawnRate: 0.6}, condition: requireUserCountWithinTime(28, 60)}
    ,{options: {floorCount: 6, elevatorCount: 4, spawnRate: 1.7}, condition: requireUserCountWithinTime(100, 68)}
    ,{options: {floorCount: 4, elevatorCount: 2, spawnRate: 0.8}, condition: requireUserCountWithinMoves(40, 60)}
    ,{options: {floorCount: 3, elevatorCount: 3, spawnRate: 3.0}, condition: requireUserCountWithinMoves(100, 63)}
    ,{options: {floorCount: 6, elevatorCount: 2, spawnRate: 0.4}, condition: requireUserCountWithMaxWaitTime(50, 21)}
    ,{options: {floorCount: 7, elevatorCount: 3, spawnRate: 0.6}, condition: requireUserCountWithMaxWaitTime(50, 19)}

    ,{options: {floorCount: 9, elevatorCount: 5, spawnRate: 1.1}, condition: requireUserCountWithMaxWaitTime(60, 18)}
    ,{options: {floorCount: 9, elevatorCount: 5, spawnRate: 1.1}, condition: requireUserCountWithMaxWaitTime(70, 17)}
    ,{options: {floorCount: 9, elevatorCount: 5, spawnRate: 1.1}, condition: requireUserCountWithMaxWaitTime(80, 16.5)}
    ,{options: {floorCount: 9, elevatorCount: 5, spawnRate: 1.1}, condition: requireUserCountWithMaxWaitTime(90, 16)}
    ,{options: {floorCount: 9, elevatorCount: 5, spawnRate: 1.1}, condition: requireUserCountWithMaxWaitTime(100, 15.5)}
    ,{options: {floorCount: 9, elevatorCount: 5, spawnRate: 1.1}, condition: requireUserCountWithMaxWaitTime(110, 15)}
    ,{options: {floorCount: 9, elevatorCount: 5, spawnRate: 1.1}, condition: requireUserCountWithMaxWaitTime(120, 14)}

    ,{options: {floorCount: 10, elevatorCount: 10, spawnRate: 2.0}, condition: requireDemo()}
];
