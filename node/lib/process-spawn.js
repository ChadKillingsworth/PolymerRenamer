/*
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS
 */

/**
 * @fileoverview Low level class for calling the PolymerRenamer jar
 * from nodejs
 */

'use strict';

var spawn = require('child_process').spawn;
var jarPath = require.resolve('../../PolymerRenamer.jar');
var path = require('path');

/**
 * @constructor
 * @param {Object<string,string>|Array<string>} args
 */
function Renamer(args) {
  this.commandArguments = [];

  if (Array.isArray(args)) {
    this.commandArguments = args.slice();
  } else {
    for (var key in args) {
      if (Array.isArray(args[key])) {
        for (var i = 0; i < args[key].length; i++) {
          this.commandArguments.push(
              this.formatArgument(key, args[key][i]));
        }
      } else {
        this.commandArguments.push(
            this.formatArgument(key, args[key]));
      }
    }
  }

  //this.commandArguments.unshift('-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005', '-jar', Renamer.JAR_PATH);
  this.commandArguments.unshift('-jar', Renamer.JAR_PATH);
}

/**
 * @const
 * @type {string}
 */
Renamer.JAR_PATH = jarPath;

/**
 * @type {string}
 */
Renamer.prototype.javaPath = 'java';

/** @type {function(...*)|null} */
Renamer.prototype.logger = null;

/** @type {Object<string, string>} */
Renamer.prototype.spawnOptions = undefined;

/**
 * @param {function(number, string, string)=} callback
 * @return {child_process.ChildProcess}
 */
Renamer.prototype.run = function(callback) {
  if (this.logger) {
    this.logger(this.getFullCommand() + '\n');
  }

  var renamerProcess = spawn(this.javaPath, this.commandArguments, this.spawnOptions);

  var stdOutData = '', stdErrData = '';
  if (callback) {
    renamerProcess.stdout.on('data', function (data) {
      stdOutData += data;
    });

    renamerProcess.stderr.on('data', function (data) {
      stdErrData += data;
    });

    renamerProcess.on('close', (function (code) {
      if (code !== 0) {
        stdErrData = this.prependFullCommand(stdErrData);
      }

      callback(code, stdOutData, stdErrData);
    }).bind(this));

    renamerProcess.on('error', (function (err) {
      callback(1, stdOutData,
          this.prependFullCommand('Process spawn error. Is java in the path?\n' + err.message));
    }).bind(this));
  }

  return renamerProcess;
};

/**
 * @return {string}
 */
Renamer.prototype.getFullCommand = function() {
  return this.javaPath + ' ' + this.commandArguments.join(' ');
};

/**
 * @param {string} msg
 * @return {string}
 */
Renamer.prototype.prependFullCommand = function(msg) {
  return this.getFullCommand() + '\n\n' + msg + '\n\n';
};

/**
 * @param {string} key
 * @param {(string|boolean)=} val
 * @return {string}
 */
Renamer.prototype.formatArgument = function(key, val) {
  if (val === undefined || val === null) {
    return '--' + key;
  }

  return '--' + key + '=' + val;
};

module.exports = Renamer;
