const express = require('express');
const bcrypt = require('bcryptjs');
const { get } = require('../db');
const { requireAuth, signToken, setAuthCookie, clearAuthCookie } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = signToken({ id: user.id, username: user.username, name: user.name });
    setAuthCookie(res, token);

    res.json({ id: user.id, username: user.username, name: user.name, color: user.color });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await get('SELECT id, username, name, color FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
