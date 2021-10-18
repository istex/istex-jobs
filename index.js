// const { scheduleJob } = require('./src/jobManager');
// const { generateKbart, generateHoldings } = require('./src/tasks/index');
// const { nodeMailer } = require('@istex/config-component').get(module);
//
// (async function main () {
//  // const job = scheduleJob(generateKbart,
//  //  [{ corpus: 'bmj' }],
//  //  '*',
//  //  'Generate allTitle KBART',
//  //  { sendMailOnErrorTo: nodeMailer.onErrorTo },
//  // );
//  const job = scheduleJob(generateHoldings,
//    [{ corpus: 'wiley', force: false }],
//    '29 * * * *',
//    'Generate allTitle Holdings',
//    { sendMailOnErrorTo: nodeMailer.onErrorTo },
//  );
// })()
//  .catch((reason) => {
//    console.error(reason);
//    process.exit(1);
//  });

'use strict';

const config = require('@istex/config-component').get(module)
;

// @todo create by worker setup process
Error.stackTraceLimit = config.nodejs.stackTraceLimit || Error.stackTraceLimit;

process.on('unhandledRejection', (reason, p) => {
  logError('Unhandled Rejection at:', p, 'reason:', reason);
  if (config.app.doExitOnUnhandledRejection) {
    process.exit(1);
  }
});

const express = require('express');
const app = express();
const myColors = require('./helpers/myColors');
const { logInfo, logError, logWarning } = require('./helpers/logger');
const helmet = require('helmet');
const semver = require('semver');
const compression = require('compression');
const _ = require('lodash');

const
  root = require('./src/controllers/root');
const jobs = require('./src/controllers/jobs');
const errorHandler = require('./src/middlewares/errorHandler');
const resConfig = require('./src/middlewares/resConfig');
const httpMethodsHandler = require('./src/middlewares/httpMethodsHandler');
const morgan = require('./src/middlewares/morgan');
const notFoundHandler = require('./src/middlewares/notFoundHandler');
const bodyParser = require('body-parser');
const qs = require('querystringify');
const userAgent = require('express-useragent')
;

module.exports = app;

const server = startServer();

function startServer () {
  return app.listen(
    config.express.api.port,
    config.express.api.host,
    () => {
      logInfo(
        'server listening on ',
        `${config.express.api.host + ':' + config.express.api.port}`.bold.success);
    },
  );
}

app.set('etag', false);
app.set('json spaces', 2);
app.set('trust proxy', _.get(config.security, 'reverseProxy', false));
app.set('query parser', (queryString) => qs.parse(queryString || ''));
app.use(helmet({ noSniff: false }), morgan);

app.use(bodyParser.json());
app.use(resConfig, httpMethodsHandler);
app.use(compression());
app.get('/', (req, res) => { res.redirect(`/v${semver.major(config.app.version)}`); });
app.use(`/v${semver.major(config.app.version)}`, userAgent.express(), root, jobs);
// This two must be last
app.use(notFoundHandler);
app.use(errorHandler);
