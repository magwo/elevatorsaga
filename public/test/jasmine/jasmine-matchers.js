/*
 * Copyright © 2013 Jamie Mason, @fold_left,
 * https://github.com/JamieMason
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

beforeEach(function() {

  var matchers = {};
  var priv = {};

  priv.each = function(array, fn) {
    var i;
    var len = array.length;
    if ('length' in array) {
      for (i = 0; i < len; i++) {
        fn.call(this, array[i], i, array);
      }
    } else {
      for (i in array) {
        fn.call(this, array[i], i, array);
      }
    }
  };

  priv.all = function(array, fn) {
    var i;
    var len = array.length;
    for (i = 0; i < len; i++) {
      if (fn.call(this, array[i], i, array) === false) {
        return false;
      }
    }
    return true;
  };

  priv.some = function(array, fn) {
    var i;
    var len = array.length;
    for (i = 0; i < len; i++) {
      if (fn.call(this, array[i], i, array) === true) {
        return true;
      }
    }
    return false;
  };

  priv.expectAllMembers = function(assertion) {
    return priv.all.call(this, this.actual, function(item) {
      return matchers[assertion].call({
        actual: item
      });
    });
  };

  /**
   * Assert subject is of type
   * @param  {Mixed} subject
   * @param  {String} type
   * @return {Boolean}
   */

  priv.is = function(subject, type) {
    return Object.prototype.toString.call(subject) === '[object ' + type + ']';
  };

  /**
   * Assert subject is an HTML Element with the given node type
   * @return {Boolean}
   */

  priv.isHtmlElementOfType = function(subject, type) {
    return subject && subject.nodeType === type;
  };

  /**
   * Convert Array-like Object to true Array
   * @param  {Mixed[]} list
   * @return {Array}
   */

  priv.toArray = function (list) {
    return [].slice.call(list);
  };

  // Arrays
  // ---------------------------------------------------------------------------

  priv.createToBeArrayOfXsMatcher = function (toBeX) {
    return function () {
      return matchers.toBeArray.call(this) && priv.expectAllMembers.call(this, toBeX);
    };
  };

  /**
   * Assert subject is an Array (from this document, eg Arrays from iframes
   * or popups won't match)
   * @return {Boolean}
   */
  matchers.toBeArray = function () {
    return this.actual instanceof Array;
  };

  /**
   * Assert subject is an Array with a defined number of members
   * @param  {Number} size
   * @return {Boolean}
   */
  matchers.toBeArrayOfSize = function (size) {
    return matchers.toBeArray.call(this) && this.actual.length === size;
  };

  /**
   * Assert subject is an Array, but with no members
   * @return {Boolean}
   */
  matchers.toBeEmptyArray = function () {
    return matchers.toBeArrayOfSize.call(this, 0);
  };

  /**
   * Assert subject is an Array with at least one member
   * @return {Boolean}
   */
  matchers.toBeNonEmptyArray = function () {
    return matchers.toBeArray.call(this) && this.actual.length > 0;
  };

  /**
   * Assert subject is an Array which is either empty or contains only Objects
   * @return {Boolean}
   */
  matchers.toBeArrayOfObjects = priv.createToBeArrayOfXsMatcher('toBeObject');

  /**
   * Assert subject is an Array which is either empty or contains only Strings
   * @return {Boolean}
   */
  matchers.toBeArrayOfStrings = priv.createToBeArrayOfXsMatcher('toBeString');

  /**
   * Assert subject is an Array which is either empty or contains only Numbers
   * @return {Boolean}
   */
  matchers.toBeArrayOfNumbers = priv.createToBeArrayOfXsMatcher('toBeNumber');

  /**
   * Assert subject is an Array which is either empty or contains only Booleans
   * @return {Boolean}
   */
  matchers.toBeArrayOfBooleans = priv.createToBeArrayOfXsMatcher('toBeBoolean');

  // Booleans
  // ---------------------------------------------------------------------------

  /**
   * Assert subject is not only truthy or falsy, but an actual Boolean
   * @return {Boolean}
   */
  matchers.toBeBoolean = function() {
    return matchers.toBeTrue.call(this) || matchers.toBeFalse.call(this);
  };

  /**
   * Assert subject is not only truthy, but an actual Boolean
   * @return {Boolean}
   */
  matchers.toBeTrue = function() {
    return this.actual === true || this.actual instanceof Boolean && this.actual.valueOf() === true;
  };

  /**
   * Assert subject is not only falsy, but an actual Boolean
   * @return {Boolean}
   */
  matchers.toBeFalse = function() {
    return this.actual === false || this.actual instanceof Boolean && this.actual.valueOf() === false;
  };

  // Browser
  // ---------------------------------------------------------------------------

  /**
   * Assert subject is the window global
   * @return {Boolean}
   */
  matchers.toBeWindow = function() {
    return typeof window !== 'undefined' && this.actual === window;
  };

  /**
   * Assert subject is the document global
   * @return {Boolean}
   */
  matchers.toBeDocument = function() {
    return typeof document !== 'undefined' && this.actual === document;
  };

  /**
   * Assert subject is an HTML Element
   * @return {Boolean}
   */
  matchers.toBeHtmlNode = function() {
    return priv.isHtmlElementOfType(this.actual, 1);
  };

  /**
   * Assert subject is an HTML Text Element
   * @return {Boolean}
   */
  matchers.toBeHtmlTextNode = function() {
    return priv.isHtmlElementOfType(this.actual, 3);
  };

  /**
   * Assert subject is an HTML Text Element
   * @return {Boolean}
   */
  matchers.toBeHtmlCommentNode = function() {
    return priv.isHtmlElementOfType(this.actual, 8);
  };

  /**
   * Assert subject is a Date
   * @return {Boolean}
   */
  matchers.toBeDate = function() {
    return this.actual instanceof Date;
  };

  /**
   * Assert subject is a Date String conforming to the ISO 8601 standard
   * @return {Boolean}
   */
  matchers.toBeIso8601 = function() {
    return matchers.toBeString.call(this)
      && this.actual.length >= 10
      && new Date(this.actual).toString() !== 'Invalid Date'
      && new Date(this.actual).toISOString().slice(0, this.actual.length) === this.actual;
  };

  /**
   * Assert subject is a Date occurring before another Date
   * @param {Date} date
   * @return {Boolean}
   */
  matchers.toBeBefore = function(date) {
    return matchers.toBeDate.call(this) && matchers.toBeDate.call({ actual: date }) && this.actual.getTime() < date.getTime();
  };

  /**
   * Assert subject is a Date occurring after another Date
   * @param {Date} date
   * @return {Boolean}
   */
  matchers.toBeAfter = function(date) {
    return matchers.toBeBefore.call({ actual: date }, this.actual);
  };

  // Errors
  // ---------------------------------------------------------------------------

  /**
   * Asserts subject throws an Error of any type
   * @return {Boolean}
   */
  matchers.toThrowAnyError = function() {
    var threwError = false;
    try {
      this.actual();
    } catch (e) {
      threwError = true;
    }
    return threwError;
  };

  /**
   * Asserts subject throws an Error of a specific type, such as 'TypeError'
   * @param  {String} type
   * @return {Boolean}
   */
  matchers.toThrowErrorOfType = function(type) {
    var threwErrorOfType = false;
    try {
      this.actual();
    } catch (e) {
      threwErrorOfType = (e.name === type);
    }
    return threwErrorOfType;
  };

  // Members
  // ---------------------------------------------------------------------------

  /**
   * Assert subject is an Object containing an Array at memberName
   * @name toHaveArray
   * @param {String} memberName
   * @return {Boolean}
   */

  /**
   * Assert subject is an Object containing an Array of size at memberName
   * @name toHaveArrayOfSize
   * @param {String} memberName
   * @param {Number} size
   * @return {Boolean}
   */

  /**
   * Assert subject is an Object containing an Array at memberName with no members
   * @name toHaveEmptyArray
   * @param {String} memberName
   * @return {Boolean}
   */

  /**
   * Assert subject is an Object containing an Array at memberName with at least one member
   * @name toHaveNonEmptyArray
   * @param {String} memberName
   * @return {Boolean}
   */

  /**
   * Assert subject is an Object containing an Array at memberName where no member is not an Object
   * @name toHaveArrayOfObjects
   * @param {String} memberName
   * @return {Boolean}
   */

  /**
   * Assert subject is an Object containing an Array at memberName where no member is not a String
   * @name toHaveArrayOfStrings
   * @param {String} memberName
   * @return {Boolean}
   */

  /**
   * Assert subject is an Object containing an Array at memberName where no member is not a Number
   * @name toHaveArrayOfNumbers
   * @param {Number} memberName
   * @return {Boolean}
   */

  /**
   * Assert subject is an Object containing an Array at memberName where no member is not a Boolean
   * @name toHaveArrayOfBooleans
   * @param {Boolean} memberName
   * @return {Boolean}
   */

  /**
   * @param  {String} matcherName
   * @return {Function}
   */

  function assertMember(matcherName) {
    return function() {
      var args = priv.toArray(arguments);
      var memberName = args.shift();
      return matchers.toBeObject.call(this) && matchers[matcherName].apply({
        actual: this.actual[memberName]
      }, args);
    };
  }

  priv.each([
    'Array',
    'ArrayOfSize',
    'EmptyArray',
    'NonEmptyArray',
    'ArrayOfObjects',
    'ArrayOfStrings',
    'ArrayOfNumbers',
    'ArrayOfBooleans'
  ], function(matcherName) {
    matchers['toHave' + matcherName] = assertMember('toBe' + matcherName);
  });

  // Numbers
  // ---------------------------------------------------------------------------

  /**
   * Assert subject is not only calculable, but an actual Number
   * @return {Boolean}
   */
  matchers.toBeNumber = function() {
    return !isNaN(parseFloat(this.actual)) && !priv.is(this.actual, 'String');
  };

  /**
   * Assert subject is an even Number
   * @return {Boolean}
   */
  matchers.toBeEvenNumber = function() {
    return matchers.toBeNumber.call(this) && this.actual % 2 === 0;
  };

  /**
   * Assert subject is an odd Number
   * @return {Boolean}
   */
  matchers.toBeOddNumber = function() {
    return matchers.toBeNumber.call(this) && this.actual % 2 !== 0;
  };

  /**
   * Assert subject can be used in Mathemetic calculations, despite not being an actual Number.
   * @example "1" * "2" === 2 (pass)
   * @example "wut?" * "2" === NaN (fail)
   * @return {Boolean}
   */
  matchers.toBeCalculable = function() {
    return !isNaN(this.actual * 2);
  };

  /**
   * Assert value is >= floor or <= ceiling
   * @param {Number} floor
   * @param {Number} ceiling
   * @return {Boolean}
   */
  matchers.toBeWithinRange = function(floor, ceiling) {
    return matchers.toBeNumber.call(this) && this.actual >= floor && this.actual <= ceiling;
  };

  /**
   * Assert value is a number with no decimal places
   * @return {Boolean}
   */
  matchers.toBeWholeNumber = function() {
    return matchers.toBeNumber.call(this) && (this.actual === 0 || this.actual % 1 === 0);
  };

  // Objects
  // ---------------------------------------------------------------------------

  /**
   * Assert subject is an Object, and not null
   * @return {Boolean}
   */
  matchers.toBeObject = function() {
    return this.actual instanceof Object;
  };

  /**
   * Assert subject features the same public members as api.
   * @param  {Object|Array} api
   * @return {Boolean}
   */
  matchers.toImplement = function(api) {
    var required;
    if (!this.actual || !api) {
      return false;
    }
    for (required in api) {
      if ((required in this.actual) === false) {
        return false;
      }
    }
    return true;
  };

  /**
   * Assert subject is a function
   * @return {Boolean}
   */
  matchers.toBeFunction = function() {
    return this.actual instanceof Function;
  };

  // Strings
  // ---------------------------------------------------------------------------

  /**
   * Assert subject is a String
   * @return {Boolean}
   */
  matchers.toBeString = function() {
    return priv.is(this.actual, 'String');
  };

  /**
   * @return {Boolean}
   */
  matchers.toBeEmptyString = function() {
    return this.actual === '';
  };

  /**
   * @return {Boolean}
   */
  matchers.toBeNonEmptyString = function() {
    return matchers.toBeString.call(this) && this.actual.length > 0;
  };

  /**
   * Assert subject is string containing HTML Markup
   * @return {Boolean}
   */
  matchers.toBeHtmlString = function() {
    return matchers.toBeString.call(this) && this.actual.search(/<([a-z]+)([^<]+)*(?:>(.*)<\/\1>|\s+\/>)/) !== -1;
  };

  /**
   * Assert subject is string containing parseable JSON
   * @return {Boolean}
   */
  matchers.toBeJsonString = function() {
    var isParseable;
    var json;
    try {
      json = JSON.parse(this.actual);
    } catch (e) {
      isParseable = false;
    }
    return isParseable !== false && json !== null;
  };

  /**
   * Assert subject is a String containing nothing but whitespace
   * @return {Boolean}
   */
  matchers.toBeWhitespace = function() {
    return matchers.toBeString.call(this) && this.actual.search(/\S/) === -1;
  };

  /**
   * Assert subject is a String whose first characters match our expected string
   * @param  {String} expected
   * @return {Boolean}
   */
  matchers.toStartWith = function (expected) {
    if (!matchers.toBeNonEmptyString.call(this) || !matchers.toBeNonEmptyString.call({ actual: expected })) {
      return false;
    }
    return this.actual.slice(0, expected.length) === expected;
  };

  /**
   * Assert subject is a String whose last characters match our expected string
   * @param  {String} expected
   * @return {Boolean}
   */
  matchers.toEndWith = function (expected) {
    if (!matchers.toBeNonEmptyString.call(this) || !matchers.toBeNonEmptyString.call({ actual: expected })) {
      return false;
    }
    return this.actual.slice(this.actual.length - expected.length, this.actual.length) === expected;
  };

  /**
   * Assert subject is a String whose length is greater than our other string
   * @param  {String} other
   * @return {Boolean}
   */
  matchers.toBeLongerThan = function (other) {
    return matchers.toBeString.call(this) && matchers.toBeString.call({
      actual: other
    }) && this.actual.length > other.length;
  };

  /**
   * Assert subject is a String whose length is less than our other string
   * @param  {String} other
   * @return {Boolean}
   */
  matchers.toBeShorterThan = function (other) {
    return matchers.toBeString.call(this) && matchers.toBeString.call({
      actual: other
    }) && this.actual.length < other.length;
  };

  /**
   * Assert subject is a String whose length is equal to our other string
   * @param  {String} other
   * @return {Boolean}
   */
  matchers.toBeSameLengthAs = function (other) {
    return matchers.toBeString.call(this) && matchers.toBeString.call({
      actual: other
    }) && this.actual.length === other.length;
  };


  // Create adapters for the original matchers so they can be compatible with Jasmine 2.0.

  var isJasmineV1 = typeof this.addMatchers === 'function';
  var isJasmineV2 = typeof jasmine.addMatchers === 'function';
  var v2Matchers = {};

  if (isJasmineV1) {
    this.addMatchers(matchers);
  } else if (isJasmineV2) {
    priv.each(matchers, function(fn, name) {
      v2Matchers[name] = function() {
        return {
          compare: function(actual, expected) {
            var args = priv.toArray(arguments);
            var scope = {
              actual: actual
            };
            args.shift();
            return {
              pass: matchers[name].apply(scope, args)
            };
          }
        };
      };
    });
    jasmine.addMatchers(v2Matchers);
  }

});
