require('dotenv').config();

const path = require('node:path');
const express = require('express');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Static hosting - only needed for local dev. In production this is handled
// by Netlify's static file serving instead.
app.use(express.static(PUBLIC_DIR));

app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

app.listen(PORT, () => {
  console.log(`GroomCal server running at http://localhost:${PORT}`);
});
