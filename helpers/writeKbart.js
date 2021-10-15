'use strict';

const hl = require('highland');
const { exchange } = require('@istex/config-component').get(module);
const fs = require('fs-extra');
const path = require('path');
const dateFormat = require('dateformat');

/*
 * @see https://www.uksg.org/kbart/s5/guidelines/data_format
 */
module.exports.writeKbart = function ({
  providerName = 'ISTEX',
  collectionName = 'AllTitle',
  outputPath = exchange.outputPath,
} = {}) {
  return function (s) {
    return s.consume(_writeKbart({ providerName, collectionName, outputPath }));
  };
};

//
// private helpers
//
function _writeKbart ({
  providerName = '',
  collectionName = '',
  outputPath = './',
} = {}) {
  let isFirstIteration = true;

  return function _write (err, x, push, next) {
    let flag = 'a';
    if (err) {
      push(err);
      next();
    } else if (x === hl.nil) {
      push(null, x);
    } else {
      if (isFirstIteration) {
        isFirstIteration = false;
        flag = 'w';
      }
      fs.outputFile(
        path.join(
          outputPath,
          `${providerName}_${collectionName}_${dateFormat(new Date(), 'yyyy-mm-dd')}.txt`,
        ),
        x,
        { flag, encoding: 'utf-8' },
        (err) => {
          if (err) {
            push(err);
          } else {
            push(null, x);
          }
          next();
        });
    }
  };
}
