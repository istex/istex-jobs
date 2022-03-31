const { logError } = require('../../helpers/logger');
const VError = require('verror');

module.exports = errorHandler;

function errorHandler (err, req, res, next) {
  const status = [400, 409, 404].includes(err.status) ? err.status : 500;
  if (status === 500) {
    const verror = VError(
      { cause: err, name: 'ApiError' },
      'Error requesting: %s',
      req.originalUrl);
    logError(verror);
  }

  res.sendStatus(status);
}
