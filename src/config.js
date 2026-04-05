const path = require('path');
require('dotenv').config();

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

const dbFileFromEnv = process.env.DB_FILE || './data/finance.db';
const DB_FILE = path.isAbsolute(dbFileFromEnv)
  ? dbFileFromEnv
  : path.join(process.cwd(), dbFileFromEnv);

module.exports = {
  PORT,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  DB_FILE,
};
