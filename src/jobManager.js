const assert = require('assert').strict;
const schedule = require('node-schedule');
const parser = require('cron-parser');
const { logInfo, logSuccess, logWarning, logError, getUtcDate } = require('../helpers/logger');
const { sendErrorMail, getEtherealTransport } = require('./mailManager');
const nodemailer = require('nodemailer');
const { app, nodeMailer } = require('@istex/config-component').get(module);

module.exports.scheduleJob = scheduleJob;

function scheduleJob (
  task,
  taskArgs = [],
  spec = '* * * * *',
  jobName = null,
  isOneTimeJob = false,
  {
    sendMailOnErrorTo = [],
  } = {},
) {
  assert.strictEqual(typeof task, 'function', 'Expect <task> to be a {function}');
  assert.ok(Array.isArray(taskArgs), 'Expect <taskArgs> to be an {Array}');
  assert.strictEqual(typeof spec, 'string', 'Expect <spec> to be a {string}');
  parser.parseExpression(spec); // Expect spec to be a valid Cron expression
  assert.strictEqual(Array.isArray(sendMailOnErrorTo), true, 'Expect <sendMailOnErrorTo> to be a {Array}');
  assert.strictEqual(typeof isOneTimeJob, 'boolean', 'Expect <isOneTimeJob> to be a {boolean}');

  const args = [
    function f () {
      if (this.running > 0) {
        this?.emit('abort', 'Job already running');
        return;
      }
      if (isOneTimeJob) {
        this.cancel();
      }
      return task.call(this, ...taskArgs);
    }];

  if (typeof jobName === 'string') args.unshift(jobName);

  const job = new schedule.Job(...args);

  job.on('abort', function (reason) {
    this.job.aborted = true;
    logWarning(`Job ${this?.name?.bold} aborted: ${reason ?? ''}`);
  });

  job.on('canceled',
    function (fireDate) { logWarning(`Job ${this?.name?.bold} scheduled to start at [${getUtcDate(fireDate)}] is canceled`); });

  job.on('run', function (fireDate) {
    logInfo(`Job ${this?.name?.bold} started`);
  });

  job.on('success',
    function () {
      const message = `Job ${this?.name?.bold} finished ${this.job.aborted === true ? 'and was aborted' : 'with success'}` +
                      `${this.nextInvocation() ? ', next schedule at [' + getUtcDate(this.nextInvocation()) + ']' : ''}`;
      logSuccess(message);
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
      if (nodeMailer.useEthereal === true) { transport = await getEtherealTransport(); }
      sendErrorMail({
        to: sendMailOnErrorTo,
        subject: `<istex-jobs> [Error] on task: ${this.name}`,
        text: `[${getUtcDate()}] An error occur on task: ${this.name}\n${reason}`,
      }, {
        transport,
      }).then((info) => {
        logInfo(`Job ${this?.name?.bold}: Message sent TO: `, info.accepted);
        if (nodeMailer.useEthereal === true) {
          logInfo(`Job ${this?.name?.bold}: Node Mailer preview URL: `, nodemailer.getTestMessageUrl(info));
        }
      })
        .catch((reason) => {
          logError(reason);
        });
    });

  job.schedule(spec);

  return job;
}
