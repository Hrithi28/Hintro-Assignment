const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'hintro.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initSchema();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      participants TEXT NOT NULL,
      meeting_date TEXT NOT NULL,
      transcript TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS meeting_analyses (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL UNIQUE,
      summary TEXT NOT NULL,
      decisions TEXT NOT NULL,
      follow_ups TEXT NOT NULL,
      analyzed_at TEXT NOT NULL,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id)
    );

    CREATE TABLE IF NOT EXISTS action_items (
      id TEXT PRIMARY KEY,
      meeting_id TEXT,
      task TEXT NOT NULL,
      assignee TEXT NOT NULL,
      assignee_email TEXT,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      citations TEXT NOT NULL DEFAULT '[]',
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reminder_history (
      id TEXT PRIMARY KEY,
      action_item_id TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      channel TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      FOREIGN KEY (action_item_id) REFERENCES action_items(id)
    );
  `);
  saveDb();
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function get(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

module.exports = { getDb, query, run, get, saveDb };
