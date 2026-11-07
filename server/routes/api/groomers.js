const express = require('express');
const { all } = require('../../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const groomers = await all('SELECT id, name, color FROM users ORDER BY name');
    res.json(groomers);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
