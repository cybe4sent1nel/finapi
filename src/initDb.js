const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

async function initDb() {
  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('VIEWER', 'ANALYST', 'ADMIN')),
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS financial_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL CHECK (amount > 0),
      type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_by INTEGER NOT NULL,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_financial_records_date ON financial_records(date);
    CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
    CREATE INDEX IF NOT EXISTS idx_financial_records_category ON financial_records(category);
    CREATE INDEX IF NOT EXISTS idx_financial_records_deleted ON financial_records(deleted_at);
  `);

  const existingUsers = await db.get('SELECT COUNT(*) AS count FROM users');
  if (existingUsers.count === 0) {
    const users = [
      {
        name: 'Fahad Khan',
        email: 'fahad.khan@demo.local',
        password: 'Admin@123',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      {
        name: 'Nayak',
        email: 'nayak@demo.local',
        password: 'Analyst@123',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      {
        name: 'Insight Analyst',
        email: 'analyst@demo.local',
        password: 'Analyst@123',
        role: 'ANALYST',
        status: 'ACTIVE',
      },
      {
        name: 'Read Only Viewer',
        email: 'viewer@demo.local',
        password: 'Viewer@123',
        role: 'VIEWER',
        status: 'ACTIVE',
      },
    ];

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await db.run(
        `
          INSERT INTO users (name, email, password_hash, role, status)
          VALUES (?, ?, ?, ?, ?)
        `,
        [user.name, user.email.toLowerCase(), passwordHash, user.role, user.status]
      );
    }

    const seededRecords = [
      [2500, 'INCOME', 'Salary', '2026-03-01', 'Monthly salary', 1],
      [300, 'EXPENSE', 'Groceries', '2026-03-02', 'Supermarket purchase', 1],
      [120, 'EXPENSE', 'Internet', '2026-03-03', 'Broadband bill', 1],
      [450, 'INCOME', 'Freelance', '2026-03-08', 'Website project', 2],
      [90, 'EXPENSE', 'Transport', '2026-03-09', 'Fuel and tolls', 2],
    ];

    for (const record of seededRecords) {
      await db.run(
        `
          INSERT INTO financial_records
          (amount, type, category, date, notes, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        record
      );
    }
  }

  const nayakEmail = 'nayak@demo.local';
  const existingNayak = await db.get(
    `
      SELECT id
      FROM users
      WHERE email = ?
    `,
    [nayakEmail]
  );

  if (!existingNayak) {
    const nayakHash = await bcrypt.hash('Analyst@123', 10);
    await db.run(
      `
        INSERT INTO users (name, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, ?)
      `,
      ['Nayak', nayakEmail, nayakHash, 'ADMIN', 'ACTIVE']
    );
  } else {
    await db.run(
      `
        UPDATE users
        SET role = 'ADMIN', status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
        WHERE email = ?
      `,
      [nayakEmail]
    );
  }
}

module.exports = { initDb };
