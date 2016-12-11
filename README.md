Elevator Saga
===================
The elevator programming game

[Play it now!](http://play.elevatorsaga.com/)

Or [Run the unit tests](http://play.elevatorsaga.com/test/)
Please report any test failures as an issue.

![Image of Elevator Saga in browser](https://raw.githubusercontent.com/magwo/elevatorsaga/master/images/screenshot.png)

### Testing

To test your solution automatically with Selenium you must install the node packages :
```Shell
npm install
```

Then, you must install [ChromeDriver](https://code.google.com/p/selenium/wiki/ChromeDriver), with OS X, you can use brew : 

```Shell
brew install chromedriver
```

To generate the stats and test your solution automatically, you can run this command : 

```Shell
gulp --challenges 1,2 --numberOfTestsPerChallenge 10 --solutionToTest alber70g.solution.js --timeScale 21
```
**Parameters**

* **--challenges** (default : 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17) : challenges to run, separated with a comma.
* **--numberOfTestsPerChallenge** (default : 1) : number of test to execute for each challenge.
* **--solutionToTest** (default : null, all solutions are tested) : solution to test (must be in the folder solutions/working with the extension .solution.js).
* **--timeScale** (default : 21) : time scale (speed), must be in that range 1, 2, 3, 5, 8, 13, 21.

After the solution test, a stats file is written in : 

```Shell
Write stats : solutions/working/username.solution.stats.json
```

Note : If you run gulp without any parameters, it will test all solutions, which take approximativaly 6 hours for 29 solutions.

### Ranking
A ranking file, based on the total percent of each challenge, can be generated in solutions/working/ranking.md by using all solutions/working/*.solution.stats.json : 

```Shell
gulp ranking
```

So if you want to calculate your ranking, you can test your solution automatically and then generate the ranking.

Note : Each challenge of each solution must be tested the same number of times.

The ranking of [all solutions](https://github.com/magwo/elevatorsaga/wiki/Solutions) has been generated : [See ranking](https://github.com/magwo/elevatorsaga/blob/master/solutions/working/ranking.md)