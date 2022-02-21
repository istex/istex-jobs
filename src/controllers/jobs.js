'use strict';

const express = require('express');
const schedule = require('node-schedule');
const _ = require('lodash');

const router = module.exports = express.Router();

// /jobs
router.get('/jobs', (req, res, next) => {
  const jobs = _(schedule.scheduledJobs)
    .transform((accu, job, jobName) => {
      accu[jobName] = {
        taskName: job?.job?.task.name,
        nextInvocationDate: job.nextInvocation(),
        running: job.running,
      };
    })
    .value();
  res.send(jobs);
});
