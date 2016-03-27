/*
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS
 */


/**
 * @fileoverview Tests for polymer-renamer process-spawn
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';

var should = require('should');
var PolymerRenamer = require('../lib/process-spawn');
require('mocha');

describe('polymer-renamer process spawn', function() {
  it('should error when java is not in the path', function(done) {
    this.slow(1000);

    var renamer = new PolymerRenamer({ version: true});
    renamer.javaPath = 'DOES_NOT_EXIST';
    renamer.run(function(exitCode, stdout, stderr) {
      exitCode.should.not.eql(0);
      stderr.indexOf('Is java in the path?').should.be.aboveOrEqual(0);
      done();
    });
  });

  it('should normalize an options object to an arguments array', function() {
    var renamer = new PolymerRenamer({
      one: true,
      two: 'two',
      three: ['one', 'two', 'three']
    });

    var expectedArray = ['-jar', PolymerRenamer.JAR_PATH, '--one=true', '--two=two',
        '--three=one', '--three=two', '--three=three'];
    renamer.commandArguments.length.should.eql(expectedArray.length);
    renamer.commandArguments.forEach(function(item, index) {
      expectedArray[index].should.eql(item);
    });
  });

  it('should prepend the -jar argument and compiler path when configured by array', function() {
    var expectedArray = ['-jar', PolymerRenamer.JAR_PATH, '--one=true', '--two=two',
      '--three=one', '--three=two', '--three=three'];

    var renamer = new PolymerRenamer(expectedArray.slice(2));

    renamer.commandArguments.length.should.eql(expectedArray.length);
    renamer.commandArguments.forEach(function(item, index) {
      expectedArray[index].should.eql(item);
    });
  });
});
