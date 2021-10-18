const assert = require('assert').strict;
const schedule = require('node-schedule');
const parser = require('cron-parser');
const { logInfo, logSuccess, logError, getUtcDate } = require('../helpers/logger');
const { sendErrorMail, getEtherealTransport } = require('./mailManager');
const { app } = require('@istex/config-component').get(module);

module.exports.scheduleJob = scheduleJob;

function scheduleJob (
  task,
  taskArgs,
  spec,
  jobName,
  {
    sendMailOnErrorTo = [],
  } = {},
) {
  assert.strictEqual(typeof task, 'function', 'Expect func to be a Function');
  assert.ok(Array.isArray(taskArgs), 'Expect funcArgs to be a Array');
  assert.strictEqual(typeof spec, 'string', 'Expect spec to be a String');
  parser.parseExpression(spec); // Expect spec to be a valid Cron expression
  assert.strictEqual(Array.isArray(sendMailOnErrorTo), true, 'Expect sendMailOnErrorTo to be a Array');

  const args = [
    spec,
    function f (fireDate) {
      return task.call(this, ...taskArgs)
        .then(() => this.emit('finished'))
        .catch((reason) => {
          this.emit('error', reason);
        });
    }];

  if (typeof jobName === 'string') args.unshift(jobName);

  const job = schedule.scheduleJob(...args);

  job.on('runNotNeeded', function (reason) {
    logInfo(`Job ${this?.name?.bold} doesn't need to run: ${reason}`);
  });

  job.on('run', function (fireDate) {
    logInfo(`Job ${this?.name?.bold} started`);
  });

  job.on('finished',
    function () {
      logInfo(`Job ${this?.name?.bold} finished`);
    });

  job.on('scheduled', function (fireDate) {
    logInfo(`Job ${this?.name?.bold} is (re)scheduled to start at [${getUtcDate(fireDate)}]`);
  });

  job.on('error',
    function (reason) {
      logError(`Job ${this?.name?.bold} stopped with error`);
      logError(reason);
    });

  job.on('error',
    async function (reason) {
      if (sendMailOnErrorTo.length === 0) return;
      let transport;
      if (app.useEthereal === true) { transport = await getEtherealTransport(); }

      sendErrorMail({
        to: sendMailOnErrorTo,
        subject: `<istex-jobs> [Error] on task: ${this.name}`,
        text: `[${getUtcDate()}] An error occur on task: ${this.name}\n${reason}`,
      }, {
        transport,
      })
        .catch((reason) => {
          logError(reason);
        });
    });

  return job;
}
