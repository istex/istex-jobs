'use strict';
const
  { express: { allowedAccessMethods } } = require('@istex/config-component').get(module)
;

module.exports = responseConfig;

function responseConfig (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.header('Access-Control-Allow-Methods', allowedAccessMethods);
  next();
}
