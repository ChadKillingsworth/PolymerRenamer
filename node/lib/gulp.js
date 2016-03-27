/*
 * Copyright 2015 The Closure Compiler Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Gulp task for PolymerRenamer.
 * PolymerRenamer doesn't support input piped via stdin, so we have to write
 * the data to a temporary file and use that as the input.
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';

var PolymerRenamer = require('./process-spawn');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var stream = require('stream');
/** @const */
var PLUGIN_NAME = 'gulp-polymer-renamer';
var path = require('path');
var tempfile = require('tempfile');
var fs = require('fs');

/**
 * @constructor
 * @param {string} propertyMapFilePath
 * @return {boolean}
 */
function PolymerRenamerStream(propertyMapFilePath) {
  stream.Transform.call(this, {objectMode: true});
  this.propertyMapFilePath = path.resolve(propertyMapFilePath);
  this.propertyMapFileExists_ = undefined;
}
PolymerRenamerStream.prototype = Object.create(stream.Transform.prototype);

/** @return {boolean} */
PolymerRenamerStream.prototype.ensurePropertyMapFileExists = function() {
  if (this.propertyMapFileExists_ === true) {
    return;
  }

  if (this.propertyMapFileExists_ === undefined) {
    try {
      this.propertyMapFileExists_ = fs.statSync(this.propertyMapFile).isFile();
    } catch (err) {
      this.propertyMapFileExists_ = false;
    }
  }

  if (this.propertyMapFileExists_ === false) {
    this.emit('error', new PluginError(PLUGIN_NAME, 'Property map file does not exist.'));
  }
};

/**
 * @param {!Vinyl} file
 * @param {Object} enc
 * @param {function(Error=)} cb
 * @private
 */
PolymerRenamerStream.prototype._transform = function(file, enc, cb) {
  // ignore empty files
  if (file.isNull()) {
    cb();
    return;
  }

  if (file.isStream()) {
    this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));
    cb();
    return;
  }

  this.ensurePropertyMapFileExists();
  this.writeContentsToTempFile(path.extname(file.path), file.contents)
      .then(this.callRenamer.bind(this))
      .then((function (data) {
        file.contents = new Buffer(data);
        this.push(file);
        cb();
      }).bind(this))
      .catch((function(err) {
        this.emit('error', new PluginError(PLUGIN_NAME, err.toString()));
        cb();
      }).bind(this));

};

/**
 * Write the contents of the vinyl file to a temporary file
 * so that PolymerRenamer can read it. Preserve the file
 * extension since PolymerRenamer relies on the extension
 * to determine the type of renaming.
 *
 * @param {string} extension of the file (html or js)
 * @param {!Buffer} contents
 * @returns {!Promise}
 */
PolymerRenamerStream.prototype.writeContentsToTempFile = function(extension, contents) {
  return new Promise(function(resolve, reject) {
    var tmpFileName = tempfile(extension);
    fs.writeFile(tmpFileName, contents, {}, function(err) {
      if (err) {
        return reject(err);
      }
      resolve(tmpFileName);
    });
  });
};

/**
 * Spawn a process to run the PolymerRenamer jar
 *
 * @param {string} inputFileName
 * @returns {!Promise}
 */
PolymerRenamerStream.prototype.callRenamer = function(inputFileName) {
  var propertyMapFilePath = this.propertyMapFilePath;
  return new Promise(function(resolve, reject) {
    new PolymerRenamer([propertyMapFilePath, inputFileName])
        .run(function(exitCode, data, errMsg) {
          if (exitCode !== 0) {
            return reject(new Error("Non zero exit code: " + exitCode + ". " + errMsg));
          }
          console.log(data);

          resolve(data);
        });
  });
};

module.exports = function (pluginOptions) {
  return new PolymerRenamerStream(pluginOptions);
};
