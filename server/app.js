const express = require('express');
const cookieParser = require('cookie-parser');

const { ensureReady } = require('./db');
const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Normalizes the request path when this app runs as a Netlify Function.
// Locally, req.url already looks like "/api/...", so this is a no-op.
// Behind a Netlify redirect to "/.netlify/functions/api/:splat", the
// function receives "/.netlify/functions/api/..." instead - this restores
// the "/api/..." prefix so the exact same route mounts work in both places.
const FUNCTION_PREFIX = '/.netlify/functions/api';
app.use((req, res, next) => {
  if (req.url.startsWith(FUNCTION_PREFIX)) {
    req.url = '/api' + req.url.slice(FUNCTION_PREFIX.length);
  }
  next();
});

// Makes sure the schema exists and default data is seeded before handling
// any request - runs once per process (local server, or per warm function).
app.use(async (req, res, next) => {
  try {
    await ensureReady();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

// Scoped to /api so it doesn't swallow static file requests - the local
// dev server (server/index.js) adds its own static + 404 handling after
// this app, and in production Netlify serves static files separately.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
});

module.exports = app;
