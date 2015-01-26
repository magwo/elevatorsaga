/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
    // Task configuration.
    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true
      },
      dist: {
        src: ['lib/<%= pkg.name %>.js'],
        dest: 'dist/<%= pkg.name %>.js'
      }
    },
    bowercopy: {
      options: {
        destPrefix: 'src'
      },
      fontawesome: {
        files: {
          'font-awesome/css': 'fontawesome/css/*',
          'font-awesome/fonts': 'fontawesome/fonts/*'
        }
      },
      libs: {
        options: {
          destPrefix: 'src/libs'
        },
        files: {
          'jquery.min.js': 'jquery/dist/jquery.min.js',
          'jquery.min.map': 'jquery/dist/jquery.min.map',
          'lodash.min.js': 'lodash/dist/lodash.min.js',
          'riot.js': 'riot/riot.js'
        }
      }
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        unused: false,
        boss: true,
        eqnull: true,
        browser: true,
        globals: {
          $: true,
          _: true,
          console: true,
          riot: true,
          CodeMirror: true,
          confirm: true,
          asFloor: true,
          asMovable: true,
          asUser: true,
          asElevator: true,
          asElevatorInterface: true,
          createWorldController: true,
          createWorldCreator: true,
          challenges: true,
          clearAll: true,
          presentStats: true,
          presentChallenge: true,
          presentWorld: true,
          presentFeedback: true,
          presentCodeStatus: true,
          makeDemoFullscreen: true,
          limitNumber: true,
          distanceNeededToAchieveSpeed: true,
          testingImpl: true,
          accelerationNeededToAchieveChangeDistance: true,
          epsilonEquals: true,
          createBoolPassthroughFunction: true,
          linearInterpolate: true,
          expect: true,
          describe: true,
          it: true,
          beforeEach: true,
          spyOn: true,
          requireUserCountWithinTime: true,
          requireUserCountWithMaxWaitTime: true,
          requireUserCountWithinMoves: true
        }
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      elevatorsaga: {
        src: ['src/*.js']
      },
      tests: {
        src: ['src/test/tests.js']
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      tests: {
        files: '<%= jshint.lib_test.src %>',
        tasks: ['jshint:tests']
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-bowercopy');

  // Default task.
  grunt.registerTask('default', [
    'bowercopy',
    'jshint'
  ]);

};
