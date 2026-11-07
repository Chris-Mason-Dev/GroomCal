const path = require('node:path');
const fs = require('node:fs');
const { createClient } = require('@libsql/client');

// Local dev (no env vars set): a SQLite file on disk.
// Production (Netlify): set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN to point
// at a hosted Turso database instead - no code changes needed, since Turso
// speaks the same SQLite dialect and @libsql/client handles both transports.
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!process.env.TURSO_DATABASE_URL && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const url = process.env.TURSO_DATABASE_URL || `file:${path.join(DATA_DIR, 'groomcal.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0d9488',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT,
  size TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
  groomer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  service TEXT NOT NULL,
  appointment_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

async function migrate() {
  await client.executeMultiple(SCHEMA);
}

// Normalizes a libsql ResultSet row into a plain object, and BigInt ids into
// regular numbers so they serialize cleanly with JSON.stringify.
function toPlainRow(row) {
  if (!row) return row;
  const plain = {};
  for (const key of Object.keys(row)) {
    const value = row[key];
    plain[key] = typeof value === 'bigint' ? Number(value) : value;
  }
  return plain;
}

async function run(sql, args = []) {
  const result = await client.execute({ sql, args });
  return {
    lastInsertRowid: Number(result.lastInsertRowid),
    changes: result.rowsAffected
  };
}

async function get(sql, args = []) {
  const result = await client.execute({ sql, args });
  return toPlainRow(result.rows[0]);
}

async function all(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows.map(toPlainRow);
}

// Ensures the schema exists and default data is seeded exactly once per
// running process (local server, or a single warm Netlify function instance).
let readyPromise = null;
function ensureReady() {
  if (!readyPromise) {
    readyPromise = migrate().then(() => require('./seed')());
  }
  return readyPromise;
}

module.exports = { client, run, get, all, ensureReady };
