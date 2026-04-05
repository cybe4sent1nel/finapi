const jwt = require('jsonwebtoken');
const { JWT_EXPIRES_IN, JWT_SECRET } = require('./config');
const { getDb } = require('./db');

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      status: user.status,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function getUserFromAuthHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = await getDb();
    const user = await db.get(
      `
        SELECT id, name, email, role, status, created_at, updated_at
        FROM users
        WHERE id = ?
      `,
      [payload.sub]
    );

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}

module.exports = {
  signToken,
  getUserFromAuthHeader,
};
