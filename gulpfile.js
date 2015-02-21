var gulp = require('gulp');
var runSequence = require('run-sequence');
var stats = new require('./stats');
var argv = require('yargs')
            .default({ challenges : '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17', numberOfTestsPerChallenge : 1 , solutionToTest : null, timeScale : 21 })
            .argv;

gulp.task('summaries', function() {
    // Generate summaries in solutions/working/summaries.json
    return stats.generateSummaries();
});

gulp.task('ranking', ['summaries'], function() {
    // Generate ranking in solutions/working/summaries.json
    return stats.generateRanking();
});

gulp.task('stats', function() {
    // Generate stars for each solutions in solutions/working/username.solution.stats.json
    // stats task can be run with these parameters : gulp --challenges 1,2 --numberOfTestsPerChallenge 10 --solutionToTest alber70g.solution.js --timeScale 21
    // challenges : challenges to run separated with a comma. Default : 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17
    // numberOfTestsPerChallenge : number of test to execute for each challenge. Default : 1
    // solutionToTest : solution to test. Default : null (all solutions are tested)
    // timeScale : time scale (speed), must be in that range 1, 2, 3, 5, 8, 13, 21. Default : 21
    return stats.generateStats(argv.numberOfTestsPerChallenge, argv.timeScale, argv.challenges, argv.solutionToTest);
});

gulp.task('default', function(callback) {
  runSequence('stats', 'ranking', callback);
});

