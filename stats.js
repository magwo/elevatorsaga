var gutil = require('gulp-util');
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var webdriver = require('selenium-webdriver');
var By = require('selenium-webdriver').By;
var jf = require('jsonfile');
var util = require('util');

module.exports.generateRanking = function() {
    var deferred = Q.defer();

    var summaries = jf.readFileSync('solutions/working/summaries.json');

    // Calculate total percent for each user
    _.forEach(summaries, function(summary, summaryIndex) {
        summary.totalPercent = 0;

        _.forEach(summary.challenges, function(challenge, challengeIndex) {
            summary.totalPercent+=challenge.percent;
        });
    });

    // Sort by total percent descending
    summaries = _.sortByAll(summaries, ['totalPercent']).reverse();

    // Create ranking.md
    summariesFileName = 'solutions/working/ranking.md';
    summariesFileContent = '';
    _.forEach(summaries, function(summary, summaryIndex) {
        gutil.log('rank : ' + (summaryIndex+1));
        gutil.log('name : ' + summary.name);
        gutil.log('url : ' + summary.url);
        gutil.log('totalPercent : ' + summary.totalPercent);

        // Header for each user : Ranking, Name, Solution's URL and Total Percent
        summariesFileContent += '### '+ (summaryIndex+1) + '. ' + summary.name + '\n';
        summariesFileContent += '[' + summary.url + '](' + summary.url + ')\n';
        summariesFileContent += 'Total percent : ' + summary.totalPercent + '\n\n';

        // Table for each user with all challenges and percent

        // Table header
        _.forEach(summary.challenges, function(challenge, challengeIndex) {
            if (challengeIndex == (summary.challenges.length-1)) {
                summariesFileContent += challenge.challengeId;
            } else {
                summariesFileContent += challenge.challengeId + ' | ';
            }
        });

        summariesFileContent += '\n';

        // Table header separator
        _.forEach(summary.challenges, function(challenge, challengeIndex) {
            if (challengeIndex == (summary.challenges.length-1)) {
                summariesFileContent += '---';
            } else {
                summariesFileContent += '--- | ';
            }
        });

        summariesFileContent += '\n';

        // Challenge percent
        _.forEach(summary.challenges, function(challenge, challengeIndex) {
            if (challengeIndex == (summary.challenges.length-1)) {
                summariesFileContent += challenge.percent;
            } else {
                summariesFileContent += challenge.percent + ' | ';
            }
        });

        summariesFileContent += '\n\n';
    });

    fs.writeFile(summariesFileName, summariesFileContent, function(err) {
        if(err) {
            gutil.log(err);
        } else {
            gutil.log('Write ranking : ' + summariesFileName);
        }

        deferred.resolve();
    });

    return deferred.promise;
}

module.exports.generateSummaries = function() {
    var deferred = Q.defer();

    // Retrieve all *.solution.stats.json
    var resultsFilenames = fs.readdirSync('solutions/working').filter(function(file) { return file.substr(-20) === '.solution.stats.json'; });

    var allResults = [];

    _.forEach(resultsFilenames, function(filename, filenameIndex) {
        var result = jf.readFileSync('solutions/working/' + filename);
        result.filename = filename;
        allResults.push(result);
    });

    var numberOfStats = null;
    var cantBuildSummaries = false;

    // Check if we can build the summaries :
    // All challenges must have the same number of tests
    _.forEach(allResults, function(result, resultIndex) {
        _.forEach(result.challenges, function(challenge, index) {
            if (numberOfStats == null) {
                numberOfStats = challenge.stats.length;
            } else if (numberOfStats != challenge.stats.length) {
                cantBuildSummaries = true;
                gutil.log(gutil.colors.bgRed('Solution ' + result.filename + ', challenge ' + challenge.challengeId + ' has not same number of stats!'));
            }
        });
    });

    if (cantBuildSummaries) {
        throw new Error("Can't build summaries!");
    }

    // Build summary for each user
    var summaries = [];

    _.forEach(allResults, function(result, resultIndex) {
        var summary = {};
        summary.name = result.name;
        summary.url = result.url;
        summary.solution = result.solution;
        summary.challenges = [];

        _.forEach(result.challenges, function(challenge, challengeIndex) {
            var numberOfSuccess = 0;

            _.forEach(challenge.stats, function(stats, statsIndex) {
                if (stats.challengeStatus) {
                    numberOfSuccess++;
                }
            });

            summary.challenges.push({
                challengeId: challenge.challengeId,
                // Calculate percent per challenge
                percent: Math.floor((numberOfSuccess/challenge.stats.length) * 100)
            });
        });

        summaries.push(summary);
    });

    // Write summaries
    var filename = 'solutions/working/summaries.json';
    jf.writeFile(filename, summaries, function(err) {
        if(err) {
            gutil.log(err);
        } else {
            gutil.log(gutil.colors.black.bgYellow('Write summaries : ' + filename));
        }

        deferred.resolve();
    });

    return deferred.promise;
}

module.exports.generateStats = function(numberOfTestsPerChallenge, timeScale, pChallenges, pSolutionToTest) {
    var deferred = Q.defer();

    var allResults = [];
    gutil.log('Number of test to do per challenge : ' + numberOfTestsPerChallenge);

    gutil.log('Time scale : ' + timeScale);

    var challenges = [];
    if (_.isNumber(pChallenges)) {
        challenges = [pChallenges];
    } else {
        challenges = _.map(pChallenges.split(','), function(n) { return _.parseInt(n.trim()); });
    }

    // For each solution :
    //  - Foreach challenges :
    //    - Test X times :
    //      - Open the challenge page
    //      - Apply solution
    //      - Get the stats
    //  - Save the stats under githubUsername.stats.json
    // Retrieve all solutions (githubUsername.solution.js)
    var solutions = fs.readdirSync('solutions/working').filter(function(file) { return file.substr(-12) === '.solution.js'; });
    var solutionToTest = pSolutionToTest;
    gutil.log('Solution(s) to test : ' + (solutionToTest == null ? 'All' : solutionToTest));
    solutions = _.filter(solutions, function(filename) { return solutionToTest == null || solutionToTest == filename; })

    _.forEach(solutions, function(filename, filenameIndex) {
        var filenameWithoutExt = filename.substr(0, filename.lastIndexOf('.'));
        var solution = fs.readFileSync( 'solutions/working/' + filename , { encoding:'utf-8' } );

        var solutionCopy = solution;
        var solutionObj;
        if (solutionCopy.substr(0,1) == "{" && solutionCopy.substr(-1,1) == "}") {
            solutionObj = "(" + solutionCopy + ")";
        }

        // http://isolasoftware.it/2011/04/13/gwt-json-unexpected-token/
        // http://stackoverflow.com/questions/5979254/chrome-eval-function
        eval('var solutionObj = ' + solutionCopy);

        var result = {};
        result.name = solutionObj.name;
        result.url = solutionObj.url;
        result.solution = filename;
        result.challenges = [];

        // Test all challenges for the current solution
        _.forEach(challenges, function(challengeId, challengeIndex) {
            var challenge = {};
            result.challenges.push(challenge);
            challenge.challengeId = challengeId;
            challenge.stats = [];

            // Test X times the current challenge
            for(var testId=1; testId<=numberOfTestsPerChallenge; testId++) {
                (function(challengeId, challengeIndex, testId, filenameIndex) {
                    // We create a new driver for each test, with only one driver, some doesn't certainly due to JS pollution
                    var driver = new webdriver.Builder().
                    // Chrome is used in this test so you will need to download a copy of the ChromeDriver
                    // and ensure it can be found on your system PATH
                    // https://code.google.com/p/selenium/wiki/ChromeDriver
                    withCapabilities(webdriver.Capabilities.chrome()).
                    build();

                    // Timeout needs to be set or else it will fail
                    driver.manage().timeouts().setScriptTimeout(10000, 1);

                    // Open challenge
                    driver.get('file:///Volumes/SSD2/Users/rabdoun/Downloads/elevatorsaga-master/index.html#challenge='+challengeId).then(function() {
                        if (challengeIndex == 0 && testId == 1) {
                            gutil.log(gutil.colors.black.bgYellow('Solution : ' + filename + ' (' + (filenameIndex+1) + '/' + solutions.length + ')'));
                        }
                        if (testId == 1) {
                            gutil.log(gutil.colors.green('Challenge ' + challengeId + ' (' + (challengeIndex+1) + '/' + challenges.length + ')'));
                        }
                    });

                    // Increase timescale to 27 by clicking increase (default speed in game)
                    // 1x, 2x, 3x, 5x, 8x, 13x, 21x What is the max speed?
                    //driver.findElement(By.css('.fa.fa-plus-square.timescale_increase.unselectable')).click();
                    //driver.findElement(By.css('.fa.fa-plus-square.timescale_increase.unselectable')).click();
                    //driver.findElement(By.css('.fa.fa-plus-square.timescale_increase.unselectable')).click();
                    //driver.findElement(By.css('.fa.fa-plus-square.timescale_increase.unselectable')).click();
                    //driver.findElement(By.css('.fa.fa-plus-square.timescale_increase.unselectable')).click();

                    if (!_.include([1, 2, 3, 5, 8, 13, 21], timeScale)) {
                        throw new Error("timeScale must be : 1, 2, 3, 5, 8, 13, 21");
                    }

                    // Set timescale & Apply solution
                    driver.executeAsyncScript(
                        // Everything inside here will be executed by the browser, not the server
                        function (code, timeScale) {
                            app.worldController.setTimeScale(timeScale);

                            editor.setCode(code);

                            // This is the callback function we can call when everything is done
                            var cb = arguments[ arguments.length - 1 ];

                            cb();
                    }, solution, timeScale).then(function() {
                        //gutil.log('Set code');
                    });

                    // Apply solution solution (run)
                    driver.findElement(By.css('#button_apply')).click().
                    then(function() {
                        //gutil.log('1. Apply solution');

                        // Wait until the challenge is terminated, when the feedback div is displayed
                        return driver.wait(function() {
                            return driver.isElementPresent(By.css('.feedback')).then(function(displayed) {
                                if (displayed) {
                                    //gutil.log('2. Challenge finished');
                                }

                                return displayed;
                            });
                        }, 100000);
                    }).
                    then(function() {
                        // Get the result : failed or success (DOM)
                        return driver.findElement(By.css('.feedback h2:first-of-type')).getAttribute("textContent");
                    }, function(err) {
                        gutil.log('Waiting feedback error : ' + err);
                        return 'feedbackError';
                    }).
                    then(function(feedbackText) {
                        gutil.log('Test ' + testId + '/' + numberOfTestsPerChallenge + ' : ' + feedbackText);
                        //gutil.log('3. Result (DOM) : ' + text);

                        if (feedbackText === 'feedbackError') {
                            return {
                                feedbackText: feedbackText,
                                challengeStatus: null,
                                transportedCounter: null,
                                elapsedTime: null,
                                transportedPerSec: null,
                                avgWaitTime: null,
                                maxWaitTime: null,
                                moveCount: null
                            };
                        }

                        // Get the result (JS)
                        return driver.executeAsyncScript(
                            function (feedbackText) {
                                var cb = arguments[ arguments.length - 1 ];

                                cb({
                                    feedbackText: feedbackText,
                                    challengeStatus: challenges[app.currentChallengeIndex].condition.evaluate(app.world),
                                    transportedCounter: app.world.transportedCounter,
                                    elapsedTime: app.world.elapsedTime.toFixed(0),
                                    transportedPerSec: app.world.transportedPerSec.toPrecision(3),
                                    avgWaitTime: app.world.avgWaitTime.toFixed(1),
                                    maxWaitTime: app.world.maxWaitTime.toFixed(1),
                                    moveCount: app.world.moveCount
                                });
                        }, feedbackText);
                    }).
                    then(function(value) {
                        //gutil.log('4. Result (JS)');

                        challenge.testId = testId;
                        challenge.stats.push(value);

                        // If all changes have been tested, save the result
                        if (challengeIndex == (challenges.length-1) && testId == numberOfTestsPerChallenge) {
                            allResults.push(result)
                            var filenameStats = 'solutions/working/'+filenameWithoutExt+'.stats.json';
                            gutil.log('Write stats : ' + filenameStats);
                            jf.writeFileSync(filenameStats, result);
                        }
                    }).
                    then(function() {
                        return driver.quit().then(function() {
                            if (challengeIndex == (challenges.length-1) && testId == numberOfTestsPerChallenge && filenameIndex == (solutions.length-1)) {
                                deferred.resolve();
                            }
                        });
                    });
                })(challengeId, challengeIndex, testId, filenameIndex);
            }
        });
    });

    return deferred.promise;
};