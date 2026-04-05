const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { DB_FILE } = require('./config');

let dbInstance;

async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const dir = path.dirname(DB_FILE);
  fs.mkdirSync(dir, { recursive: true });

  dbInstance = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });

  await dbInstance.exec('PRAGMA foreign_keys = ON;');
  return dbInstance;
}

module.exports = { getDb };
