'use strict';
const { app } = require('@istex/config-component').get(module);
const router = require('express').Router()
;

router.get('/', (req, res) => {
  res.send(`Bienvenue sur ${app.name} - ${app.version}`);
});

module.exports = router;
