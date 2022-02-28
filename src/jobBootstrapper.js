const fs = require('fs-extra');
const assert = require('assert').strict;
const { jobs } = require('@istex/config-component').get(module);
const tasks = require('./tasks/index.js');
const { scheduleJob } = require('./jobManager');

module.exports.bootstrap = bootstrap;

async function bootstrap () {
  return Promise.resolve()
    .then(() => {
      assert.ok(Array.isArray(jobs), 'Expect jobs to be a Array');
      if (!jobs || !jobs.length) return;

      jobs.forEach(({ task, taskArgs, spec, jobName, isOneTimeJob, options } = {}) => {
        scheduleJob(tasks[task], taskArgs, spec, jobName, isOneTimeJob, options);
      });
    });
}
