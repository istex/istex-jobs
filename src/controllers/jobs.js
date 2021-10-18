'use strict';

const express = require('express');
const { logError, logDebug, logWarning } = require('../../helpers/logger');

const router = module.exports = express.Router();


// /jobs
router.get('/jobs', (req, res, next) => {

res.send('jobs');
});

