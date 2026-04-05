const bcrypt = require('bcryptjs');
const { GraphQLError } = require('graphql');
const { getDb } = require('./db');
const { signToken } = require('./auth');
const { requireAuth, requireRole } = require('./rbac');
const {
  createUserSchema,
  updateUserSchema,
  createRecordSchema,
  updateRecordSchema,
  recordFilterSchema,
  validate,
} = require('./validation');

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecord(row) {
  return {
    id: row.id,
    amount: row.amount,
    type: row.type,
    category: row.category,
    date: row.date,
    notes: row.notes,
    createdBy: async (_args, context) => {
      const db = await getDb();
      const user = await db.get(
        `
          SELECT id, name, email, role, status, created_at, updated_at
          FROM users
          WHERE id = ?
        `,
        [row.created_by]
      );

      return mapUser(user);
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getRecordByIdOrThrow(id) {
  const db = await getDb();
  const record = await db.get(
    `
      SELECT *
      FROM financial_records
      WHERE id = ? AND deleted_at IS NULL
    `,
    [id]
  );

  if (!record) {
    throw new GraphQLError('Record not found.', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  return record;
}

const root = {
  me: async (_args, context) => {
    requireAuth(context);
    return mapUser(context.user);
  },

  login: async ({ email, password }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new GraphQLError('Email and password are required.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const db = await getDb();
    const user = await db.get(
      `
        SELECT id, name, email, role, status, password_hash, created_at, updated_at
        FROM users
        WHERE email = ?
      `,
      [normalizedEmail]
    );

    if (!user || user.status !== 'ACTIVE') {
      throw new GraphQLError('Invalid credentials.', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new GraphQLError('Invalid credentials.', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const token = signToken(user);
    return {
      token,
      user: mapUser(user),
    };
  },

  users: async ({ role, status, search }, context) => {
    requireRole(context, ['ADMIN']);
    const db = await getDb();

    const where = [];
    const values = [];

    if (role) {
      where.push('role = ?');
      values.push(role);
    }

    if (status) {
      where.push('status = ?');
      values.push(status);
    }

    if (search && search.trim()) {
      where.push('(LOWER(name) LIKE ? OR LOWER(email) LIKE ?)');
      const q = `%${search.trim().toLowerCase()}%`;
      values.push(q, q);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await db.all(
      `
        SELECT id, name, email, role, status, created_at, updated_at
        FROM users
        ${clause}
        ORDER BY id DESC
      `,
      values
    );

    return rows.map(mapUser);
  },

  createUser: async ({ input }, context) => {
    requireRole(context, ['ADMIN']);
    const value = validate(createUserSchema, input);
    const db = await getDb();

    const exists = await db.get('SELECT id FROM users WHERE email = ?', [
      value.email.toLowerCase(),
    ]);

    if (exists) {
      throw new GraphQLError('Email already exists.', {
        extensions: { code: 'CONFLICT' },
      });
    }

    const passwordHash = await bcrypt.hash(value.password, 10);
    const result = await db.run(
      `
        INSERT INTO users (name, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        value.name.trim(),
        value.email.toLowerCase(),
        passwordHash,
        value.role,
        value.status || 'ACTIVE',
      ]
    );

    const user = await db.get(
      `
        SELECT id, name, email, role, status, created_at, updated_at
        FROM users
        WHERE id = ?
      `,
      [result.lastID]
    );

    return mapUser(user);
  },

  updateUser: async ({ id, input }, context) => {
    requireRole(context, ['ADMIN']);
    const value = validate(updateUserSchema, input);
    const db = await getDb();

    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      throw new GraphQLError('User not found.', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const fields = [];
    const params = [];

    if (value.name !== undefined) {
      fields.push('name = ?');
      params.push(value.name.trim());
    }

    if (value.email !== undefined) {
      const normalized = value.email.toLowerCase();
      const existing = await db.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [normalized, id]
      );
      if (existing) {
        throw new GraphQLError('Email already in use by another user.', {
          extensions: { code: 'CONFLICT' },
        });
      }
      fields.push('email = ?');
      params.push(normalized);
    }

    if (value.password !== undefined) {
      const hash = await bcrypt.hash(value.password, 10);
      fields.push('password_hash = ?');
      params.push(hash);
    }

    if (value.role !== undefined) {
      fields.push('role = ?');
      params.push(value.role);
    }

    if (value.status !== undefined) {
      fields.push('status = ?');
      params.push(value.status);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    await db.run(
      `
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = ?
      `,
      [...params, id]
    );

    const updated = await db.get(
      `
        SELECT id, name, email, role, status, created_at, updated_at
        FROM users
        WHERE id = ?
      `,
      [id]
    );

    return mapUser(updated);
  },

  setUserStatus: async ({ id, status }, context) => {
    requireRole(context, ['ADMIN']);
    const db = await getDb();

    const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      throw new GraphQLError('User not found.', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    await db.run(
      `
        UPDATE users
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [status, id]
    );

    const updated = await db.get(
      `
        SELECT id, name, email, role, status, created_at, updated_at
        FROM users
        WHERE id = ?
      `,
      [id]
    );

    return mapUser(updated);
  },

  records: async ({ filter }, context) => {
    requireRole(context, ['VIEWER', 'ANALYST', 'ADMIN']);
    const value = validate(recordFilterSchema, filter || {});
    const db = await getDb();

    const where = ['deleted_at IS NULL'];
    const values = [];

    if (value.type) {
      where.push('type = ?');
      values.push(value.type);
    }

    if (value.category) {
      where.push('LOWER(category) = ?');
      values.push(value.category.toLowerCase());
    }

    if (value.startDate) {
      where.push('date >= ?');
      values.push(value.startDate);
    }

    if (value.endDate) {
      where.push('date <= ?');
      values.push(value.endDate);
    }

    const limit = value.limit ?? 50;
    const offset = value.offset ?? 0;

    const rows = await db.all(
      `
        SELECT *
        FROM financial_records
        WHERE ${where.join(' AND ')}
        ORDER BY date DESC, id DESC
        LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return rows.map(mapRecord);
  },

  createRecord: async ({ input }, context) => {
    requireRole(context, ['ADMIN']);
    const value = validate(createRecordSchema, input);
    const db = await getDb();

    const result = await db.run(
      `
        INSERT INTO financial_records (amount, type, category, date, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        value.amount,
        value.type,
        value.category.trim(),
        value.date,
        value.notes || null,
        context.user.id,
      ]
    );

    const created = await getRecordByIdOrThrow(result.lastID);
    return mapRecord(created);
  },

  updateRecord: async ({ id, input }, context) => {
    requireRole(context, ['ADMIN']);
    const value = validate(updateRecordSchema, input);
    const db = await getDb();

    await getRecordByIdOrThrow(id);

    const fields = [];
    const params = [];

    if (value.amount !== undefined) {
      fields.push('amount = ?');
      params.push(value.amount);
    }

    if (value.type !== undefined) {
      fields.push('type = ?');
      params.push(value.type);
    }

    if (value.category !== undefined) {
      fields.push('category = ?');
      params.push(value.category.trim());
    }

    if (value.date !== undefined) {
      fields.push('date = ?');
      params.push(value.date);
    }

    if (value.notes !== undefined) {
      fields.push('notes = ?');
      params.push(value.notes || null);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    await db.run(
      `
        UPDATE financial_records
        SET ${fields.join(', ')}
        WHERE id = ? AND deleted_at IS NULL
      `,
      [...params, id]
    );

    const updated = await getRecordByIdOrThrow(id);
    return mapRecord(updated);
  },

  deleteRecord: async ({ id }, context) => {
    requireRole(context, ['ADMIN']);
    const db = await getDb();

    await getRecordByIdOrThrow(id);

    await db.run(
      `
        UPDATE financial_records
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [id]
    );

    return true;
  },

  dashboardSummary: async ({ startDate, endDate }, context) => {
    requireRole(context, ['VIEWER', 'ANALYST', 'ADMIN']);
    const db = await getDb();

    const where = ['deleted_at IS NULL'];
    const values = [];

    if (startDate) {
      where.push('date >= ?');
      values.push(startDate);
    }

    if (endDate) {
      where.push('date <= ?');
      values.push(endDate);
    }

    const whereSql = where.join(' AND ');

    const totals = await db.get(
      `
        SELECT
          COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_expense
        FROM financial_records
        WHERE ${whereSql}
      `,
      values
    );

    const categoryTotals = await db.all(
      `
        SELECT category, type, SUM(amount) AS total
        FROM financial_records
        WHERE ${whereSql}
        GROUP BY category, type
        ORDER BY total DESC
      `,
      values
    );

    const recentRows = await db.all(
      `
        SELECT *
        FROM financial_records
        WHERE ${whereSql}
        ORDER BY date DESC, id DESC
        LIMIT 5
      `,
      values
    );

    const trends = await db.all(
      `
        SELECT
          strftime('%Y-%m', date) AS period,
          COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS expense
        FROM financial_records
        WHERE ${whereSql}
        GROUP BY strftime('%Y-%m', date)
        ORDER BY period ASC
      `,
      values
    );

    const totalIncome = Number(totals.total_income || 0);
    const totalExpense = Number(totals.total_expense || 0);

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      categoryTotals: categoryTotals.map((item) => ({
        category: item.category,
        type: item.type,
        total: Number(item.total || 0),
      })),
      recentActivity: recentRows.map(mapRecord),
      trends: trends.map((item) => ({
        period: item.period,
        income: Number(item.income || 0),
        expense: Number(item.expense || 0),
        net: Number(item.income || 0) - Number(item.expense || 0),
      })),
    };
  },
};

module.exports = { root };
