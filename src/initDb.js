const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

async function ensureDemoUser(db, user) {
  const normalizedEmail = user.email.toLowerCase();
  const passwordHash = await bcrypt.hash(user.password, 10);

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);

  if (!existing) {
    await db.run(
      `
        INSERT INTO users (name, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, ?)
      `,
      [user.name, normalizedEmail, passwordHash, user.role, user.status]
    );
    return;
  }

  await db.run(
    `
      UPDATE users
      SET
        name = ?,
        password_hash = ?,
        role = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `,
    [user.name, passwordHash, user.role, user.status, normalizedEmail]
  );
}

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

  const demoUsers = [
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

  for (const user of demoUsers) {
    await ensureDemoUser(db, user);
  }

  const adminUser = await db.get('SELECT id FROM users WHERE email = ?', ['fahad.khan@demo.local']);
  const nayakUser = await db.get('SELECT id FROM users WHERE email = ?', ['nayak@demo.local']);

  const activeRecords = await db.get(
    `
      SELECT COUNT(*) AS count
      FROM financial_records
      WHERE deleted_at IS NULL
    `
  );

  if (activeRecords.count === 0 && adminUser && nayakUser) {
    const seededRecords = [
      [2500, 'INCOME', 'Salary', '2026-03-01', 'Monthly salary', adminUser.id],
      [300, 'EXPENSE', 'Groceries', '2026-03-02', 'Supermarket purchase', adminUser.id],
      [120, 'EXPENSE', 'Internet', '2026-03-03', 'Broadband bill', adminUser.id],
      [450, 'INCOME', 'Freelance', '2026-03-08', 'Website project', nayakUser.id],
      [90, 'EXPENSE', 'Transport', '2026-03-09', 'Fuel and tolls', nayakUser.id],
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
}

module.exports = { initDb };
