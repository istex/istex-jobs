/* jshint -W098 */
'use strict';
const { logError } = require('../../helpers/logger');

module.exports = errorHandler;

function errorHandler (err, req, res, next) {
  const status = [400, 409, 404].includes(err.status) ? err.status : 500;
  if (status === 500) logError(err);

  res.sendStatus(status);
}
