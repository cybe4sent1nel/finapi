const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const net = require('net');

const testDbDir = path.join(process.cwd(), 'data');
const testDbFile = path.join(testDbDir, 'finance.test.db');

let serverProcess;
let testPort;
let startupLogs = '';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        if (!port) {
          reject(new Error('Failed to allocate a free port for tests.'));
          return;
        }
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

async function waitForServer(url, timeoutMs = 10000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (serverProcess.exitCode !== null) {
      throw new Error(
        `Server process exited early with code ${serverProcess.exitCode}. Logs:\n${startupLogs}`
      );
    }

    try {
      const res = await fetch(url);
      if (res.ok) {
        return;
      }
    } catch (_err) {
      // Server not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Server did not start within timeout. Logs:\n${startupLogs}`);
}

async function gqlRequest(query, token) {
  const response = await fetch(`http://localhost:${testPort}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query }),
  });

  assert.equal(response.status, 200, 'GraphQL endpoint should return HTTP 200');
  return response.json();
}

async function login(email, password) {
  const result = await gqlRequest(`
    mutation {
      login(email: \"${email}\", password: \"${password}\") {
        token
        user {
          id
          name
          role
          status
        }
      }
    }
  `);

  assert.ok(result.data?.login?.token, 'Token must exist after login');
  return result.data.login;
}

test.before(async () => {
  fs.mkdirSync(testDbDir, { recursive: true });
  if (fs.existsSync(testDbFile)) {
    fs.rmSync(testDbFile, { force: true });
  }

  testPort = await getFreePort();
  startupLogs = '';

  serverProcess = spawn('node', ['src/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(testPort),
      DB_FILE: testDbFile,
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1h',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (chunk) => {
    startupLogs += chunk.toString();
  });

  serverProcess.stderr.on('data', (chunk) => {
    startupLogs += chunk.toString();
  });

  await waitForServer(`http://localhost:${testPort}/health`);
});

test.after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    await new Promise((resolve) => {
      serverProcess.once('exit', () => resolve());
      serverProcess.kill('SIGTERM');
      setTimeout(() => resolve(), 2000);
    });
  }

  if (fs.existsSync(testDbFile)) {
    fs.rmSync(testDbFile, { force: true });
  }
});

test('Nayak is available as ADMIN', async () => {
  const nayak = await login('nayak@demo.local', 'Analyst@123');
  assert.equal(nayak.user.name, 'Nayak');
  assert.equal(nayak.user.role, 'ADMIN');
  assert.equal(nayak.user.status, 'ACTIVE');
});

test('Viewer cannot create financial records', async () => {
  const viewer = await login('viewer@demo.local', 'Viewer@123');

  const result = await gqlRequest(
    `
      mutation {
        createRecord(input: { amount: 200, type: EXPENSE, category: \"Food\", date: \"2026-04-01\", notes: \"No permission\" }) {
          id
        }
      }
    `,
    viewer.token
  );

  assert.ok(result.errors?.length, 'Viewer should receive a permission error');
  assert.equal(result.errors[0].code, 'FORBIDDEN');
});

test('Admin can create analyst and analyst can read summary', async () => {
  const admin = await login('fahad.khan@demo.local', 'Admin@123');

  const createUserResult = await gqlRequest(
    `
      mutation {
        createUser(input: {
          name: \"QA Analyst\"
          email: \"qa.analyst@demo.local\"
          password: \"Analyst@123\"
          role: ANALYST
          status: ACTIVE
        }) {
          id
          email
          role
          status
        }
      }
    `,
    admin.token
  );

  assert.equal(createUserResult.data?.createUser?.role, 'ANALYST');

  const analyst = await login('qa.analyst@demo.local', 'Analyst@123');

  const summary = await gqlRequest(
    `
      query {
        dashboardSummary(startDate: \"2026-03-01\", endDate: \"2026-03-31\") {
          totalIncome
          totalExpense
          netBalance
          trends {
            period
            income
            expense
            net
          }
        }
      }
    `,
    analyst.token
  );

  assert.equal(summary.data.dashboardSummary.totalIncome, 2950);
  assert.equal(summary.data.dashboardSummary.totalExpense, 510);
  assert.equal(summary.data.dashboardSummary.netBalance, 2440);
});
