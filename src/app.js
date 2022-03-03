const config = require('@istex/config-component').get(module);

// @todo create by worker setup process
Error.stackTraceLimit = config.nodejs.stackTraceLimit || Error.stackTraceLimit;

process.on('unhandledRejection', (reason, p) => {
  logError('Unhandled Rejection at:', p, 'reason:', reason);
  if (config.app.doExitOnUnhandledRejection) {
    process.exit(1);
  }
});

const express = require('express');
const myColors = require('../helpers/myColors');
const { logInfo, logError, logWarning } = require('../helpers/logger');
const helmet = require('helmet');
const semver = require('semver');
const compression = require('compression');
const _ = require('lodash');
const root = require('./controllers/root');
const jobs = require('./controllers/jobs');
const errorHandler = require('./middlewares/errorHandler');
const resConfig = require('./middlewares/resConfig');
const httpMethodsHandler = require('./middlewares/httpMethodsHandler');
const morgan = require('./middlewares/morgan');
const notFoundHandler = require('./middlewares/notFoundHandler');
const bodyParser = require('body-parser');
const qs = require('querystringify');
const userAgent = require('express-useragent');
const path = require('path');
const fs = require('fs-extra');

module.exports.startServer = startServer;

async function startServer () {
  const app = express();

  app.listen(
    config.express.api.port,
    config.express.api.host,
    () => {
      logInfo(
        'server listening on ',
        `${config.express.api.host + ':' + config.express.api.port}`.bold.success);
    },
  );

  function setKbartHeaders (res) {
    try {
      const latest = fs.readJsonSync(path.join(__dirname,
        '..',
        config.exchange.outputPath,
        'kbart/ISTEX_AllTitle/latest.json'));
      res.set('Content-Disposition', `attachement; filename="${latest.latestKbartFilename}"`);
    } catch (err) {
      logWarning(err);
    }
  }

  app.set('etag', false);
  app.set('json spaces', 2);
  app.set('trust proxy', _.get(config.security, 'reverseProxy', false));
  app.set('query parser', (queryString) => qs.parse(queryString || ''));
  app.use(helmet({ noSniff: false }), morgan);
  app.use(bodyParser.json());
  app.use(resConfig, httpMethodsHandler);
  app.use(compression());
  app.use(express.static(path.join(__dirname, '..', config.exchange.outputPath, 'holdings'))); // @todo make this dynamics
  app.use('/kbart/latest.txt',
    express.static(path.join(__dirname, '..', config.exchange.outputPath, 'kbart/ISTEX_AllTitle/latest.txt'),
      { setHeaders: setKbartHeaders }));// @todo make this dynamics
  app.get('/', (req, res) => { res.redirect(`/v${semver.major(config.app.version)}`); });
  app.use(`/v${semver.major(config.app.version)}`, userAgent.express(), root, jobs);
  // This two must be last
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
