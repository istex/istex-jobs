const fs = require('fs-extra');
const assert = require('assert').strict;
const { app } = require('@istex/config-component').get(module);
const tasks = require('./tasks/index.js');
const { scheduleJob } = require('./jobManager');

module.exports.bootstrap = bootstrap;

async function bootstrap (appConfigPath = app.configPath) {
  return fs.readJson(appConfigPath)
    .then(({ jobs = [] } = {}) => {
      console.dir(jobs);
      assert.ok(Array.isArray(jobs), 'Expect jobs to be a Array');
      if (!jobs || !jobs.length) return;

      jobs.forEach(({ task, taskArgs, spec, jobName, isOneTimeJob, option } = {}) => {
        scheduleJob(tasks[task], taskArgs, spec, jobName, isOneTimeJob, option);
      });
    });
}