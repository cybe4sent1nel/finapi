# finapi

Developer: Fahad Khan

Finance Data Processing and Access Control Backend

High-quality backend submission for the finance dashboard assignment, built with **Node.js + Express + GraphQL + SQLite** and designed around maintainability, clear business logic, and strict role-based access control.

## Why this project stands out

- Clean service boundaries (auth, RBAC, validation, schema, resolvers, persistence)
- Strong access-control enforcement at resolver level
- Real dashboard analytics from SQL aggregations (not mocked values)
- Seeded demo data for instant evaluation
- Integration tests that validate auth, RBAC, and summary correctness
- Production-style README with copy-paste API verification commands

## Core Features Implemented

- User management: create/update users, role assignment, active/inactive status
- Roles: `VIEWER`, `ANALYST`, `ADMIN`
- Financial records: create, read, update, soft delete
- Record filters: type, category, date range, pagination (`limit`, `offset`)
- Dashboard summary:
  - total income
  - total expense
  - net balance
  - category-wise totals
  - recent activity
  - monthly trends
- Validation and error handling:
  - input validation via Zod
  - predictable GraphQL error codes (`BAD_USER_INPUT`, `FORBIDDEN`, etc.)

## Technology Stack

- Runtime: Node.js
- API: Express + GraphQL (`graphql-http`)
- Database: SQLite (`sqlite`, `sqlite3`)
- Auth: JWT (`jsonwebtoken`)
- Security: password hashing (`bcryptjs`)
- Validation: Zod
- Testing: Node test runner (`node:test`)

## Seeded Demo Accounts

Created automatically on first startup:

1. `Fahad Khan` (Admin)
   - Email: `fahad.khan@demo.local`
   - Password: `Admin@123`
2. `Nayak` (Admin)
   - Email: `nayak@demo.local`
   - Password: `Analyst@123`
3. `Insight Analyst` (Analyst)
   - Email: `analyst@demo.local`
   - Password: `Analyst@123`
4. `Read Only Viewer` (Viewer)
   - Email: `viewer@demo.local`
   - Password: `Viewer@123`

## Permission Matrix

- `VIEWER`
  - Can: read records, read dashboard summary
  - Cannot: create/update/delete records, manage users
- `ANALYST`
  - Can: read records, read dashboard summary
  - Cannot: create/update/delete records, manage users
- `ADMIN`
  - Can: full user management, full financial records management, all analytics

## Setup and Run

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
copy .env.example .env
```

### 3) Run in development

```bash
npm run dev
```

### 4) Run test suite

```bash
npm test
```

## Endpoints

- GraphQL: `http://localhost:4000/graphql`
- Health: `http://localhost:4000/health`

## GraphQL Playground (Direct Copy-Paste)

Open `http://localhost:4000/graphql` in your browser.

For authenticated operations in the playground, set headers like this:

```json
{
  "Authorization": "Bearer <PASTE_TOKEN_HERE>"
}
```

### 1) Login (Fahad Admin)

```graphql
mutation LoginFahad {
  login(email: "fahad.khan@demo.local", password: "Admin@123") {
    token
    user {
      id
      name
      email
      role
      status
    }
  }
}
```

### 2) Login (Nayak Admin)

```graphql
mutation LoginNayak {
  login(email: "nayak@demo.local", password: "Analyst@123") {
    token
    user {
      id
      name
      role
      status
    }
  }
}
```

### 3) Login (Viewer)

```graphql
mutation LoginViewer {
  login(email: "viewer@demo.local", password: "Viewer@123") {
    token
    user {
      id
      name
      role
      status
    }
  }
}
```

### 4) Query me

```graphql
query Me {
  me {
    id
    name
    email
    role
    status
  }
}
```

### 5) Query users (Admin only)

```graphql
query Users {
  users {
    id
    name
    email
    role
    status
  }
}
```

### 6) Query users with filters (Admin only)

```graphql
query UsersFiltered {
  users(role: ANALYST, status: ACTIVE, search: "analyst") {
    id
    name
    email
    role
    status
  }
}
```

### 7) Query records

```graphql
query Records {
  records(filter: { limit: 20, offset: 0, startDate: "2026-03-01", endDate: "2026-12-31" }) {
    id
    amount
    type
    category
    date
    notes
  }
}
```

### 8) Query records with type filter

```graphql
query ExpenseRecords {
  records(filter: { type: EXPENSE, limit: 20, offset: 0 }) {
    id
    amount
    type
    category
    date
  }
}
```

### 9) Query dashboard summary

```graphql
query DashboardSummary {
  dashboardSummary(startDate: "2026-03-01", endDate: "2026-12-31") {
    totalIncome
    totalExpense
    netBalance
    categoryTotals {
      category
      type
      total
    }
    trends {
      period
      income
      expense
      net
    }
    recentActivity {
      id
      amount
      type
      category
      date
    }
  }
}
```

### 10) Create user (Admin only)

```graphql
mutation CreateUser {
  createUser(
    input: {
      name: "Playground Analyst"
      email: "playground.analyst@demo.local"
      password: "Analyst@123"
      role: ANALYST
      status: ACTIVE
    }
  ) {
    id
    name
    email
    role
    status
  }
}
```

### 11) Update user (Admin only)

```graphql
mutation UpdateUser {
  updateUser(
    id: "1"
    input: {
      name: "Fahad Khan Updated"
    }
  ) {
    id
    name
    email
    role
    status
  }
}
```

### 12) Set user status (Admin only)

```graphql
mutation SetUserStatus {
  setUserStatus(id: "1", status: ACTIVE) {
    id
    name
    status
  }
}
```

### 13) Create record (Admin only)

```graphql
mutation CreateRecord {
  createRecord(
    input: {
      amount: 450.75
      type: INCOME
      category: "Consulting"
      date: "2026-04-05"
      notes: "Client payment"
    }
  ) {
    id
    amount
    type
    category
    date
    notes
  }
}
```

### 14) Update record (Admin only)

```graphql
mutation UpdateRecord {
  updateRecord(
    id: "1"
    input: {
      notes: "Updated from playground"
      category: "SalaryUpdated"
    }
  ) {
    id
    category
    notes
  }
}
```

### 15) Delete record (Admin only, soft delete)

```graphql
mutation DeleteRecord {
  deleteRecord(id: "1")
}
```

### 16) RBAC check (Viewer should fail)

Use a Viewer token in headers, then run:

```graphql
mutation ViewerBlocked {
  createRecord(
    input: {
      amount: 99
      type: EXPENSE
      category: "NotAllowed"
      date: "2026-04-05"
      notes: "This should fail"
    }
  ) {
    id
  }
}
```

Expected: GraphQL error code `FORBIDDEN`.

## GraphQL API

### Queries

- `me`
- `users(role, status, search)` (Admin only)
- `records(filter)`
- `dashboardSummary(startDate, endDate)`

### Mutations

- `login(email, password)`
- `createUser(input)` (Admin only)
- `updateUser(id, input)` (Admin only)
- `setUserStatus(id, status)` (Admin only)
- `createRecord(input)` (Admin only)
- `updateRecord(id, input)` (Admin only)
- `deleteRecord(id)` (Admin only, soft delete)

## Copy-Paste PowerShell Commands (End-to-End Verification)

All commands below are ready for Windows PowerShell.

### 1) Login as Fahad (Admin)

```powershell
$body = @{ query = 'mutation { login(email: "fahad.khan@demo.local", password: "Admin@123") { token user { id name role status } } }' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:4000/graphql' -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 8
```

### 2) Login as Nayak (Admin)

```powershell
$body = @{ query = 'mutation { login(email: "nayak@demo.local", password: "Analyst@123") { token user { id name role status } } }' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:4000/graphql' -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 8
```

### 3) Save Admin token for subsequent calls

```powershell
$login = Invoke-RestMethod -Uri 'http://localhost:4000/graphql' -Method Post -ContentType 'application/json' -Body (@{ query = 'mutation { login(email: "fahad.khan@demo.local", password: "Admin@123") { token } }' } | ConvertTo-Json)
$token = $login.data.login.token
$headers = @{ Authorization = "Bearer $token" }
```

### 4) Fetch current user (`me`)

```powershell
$q = @{ query = 'query { me { id name email role status } }' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:4000/graphql' -Method Post -Headers $headers -ContentType 'application/json' -Body $q | ConvertTo-Json -Depth 8
```

### 5) List users (Admin-only)

```powershell
$q = @{ query = 'query { users { id name email role status } }' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:4000/graphql' -Method Post -Headers $headers -ContentType 'application/json' -Body $q | ConvertTo-Json -Depth 8
```

### 6) Create a new analyst user

```powershell
$m = @{ query = 'mutation { createUser(input: { name: "QA Analyst", email: "qa.analyst@demo.local", password: "Analyst@123", role: ANALYST, status: ACTIVE }) { id name email role status } }' } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri 'http://localhost:4000/graphql' -Method Post -Headers $headers -ContentType 'application/json' -Body $m | ConvertTo-Json -Depth 8
```

### 7) Create financial record (Admin-only)

```powershell
$m = @{ query = 'mutation { createRecord(input: { amount: 780.5, type: INCOME, category: "Consulting", date: "2026-04-05", notes: "Contract invoice" }) { id amount type category date notes } }' } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri 'http://localhost:4000/graphql' -Method Post -Headers $headers -ContentType 'application/json' -Body $m | ConvertTo-Json -Depth 8
```

### 8) List records with filter

```powershell
$q = @{ query = 'query { records(filter: { type: EXPENSE, startDate: "2026-03-01", endDate: "2026-04-30", limit: 25, offset: 0 }) { id amount type category date notes } }' } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri 'http://localhost:4000/graphql' -Method Post -Headers $headers -ContentType 'application/json' -Body $q | ConvertTo-Json -Depth 10
```

### 9) Dashboard summary

```powershell
$q = @{ query = 'query { dashboardSummary(startDate: "2026-03-01", endDate: "2026-12-31") { totalIncome totalExpense netBalance categoryTotals { category type total } trends { period income expense net } recentActivity { id amount type category date } } }' } | ConvertTo-Json -Depth 8
Invoke-RestMethod -Uri 'http://localhost:4000/graphql' -Method Post -Headers $headers -ContentType 'application/json' -Body $q | ConvertTo-Json -Depth 10
```

### 10) RBAC proof: Viewer trying to create record should fail

```powershell
$viewerLogin = Invoke-RestMethod -Uri 'http://localhost:4000/graphql' -Method Post -ContentType 'application/json' -Body (@{ query = 'mutation { login(email: "viewer@demo.local", password: "Viewer@123") { token } }' } | ConvertTo-Json)
$viewerToken = $viewerLogin.data.login.token
$viewerHeaders = @{ Authorization = "Bearer $viewerToken" }
$m = @{ query = 'mutation { createRecord(input: { amount: 99, type: EXPENSE, category: "Unauthorized", date: "2026-04-05", notes: "Should fail" }) { id } }' } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri 'http://localhost:4000/graphql' -Method Post -Headers $viewerHeaders -ContentType 'application/json' -Body $m | ConvertTo-Json -Depth 8
```

Expected result includes error code `FORBIDDEN`.

## Testing Strategy

The integration suite verifies:

- Nayak is available as `ADMIN`
- Viewer cannot perform admin-only mutations
- Admin can create analyst user
- Analyst can access dashboard summary
- Aggregated values are correct for seeded data

Run:

```bash
npm test
```

## Data Modeling Decisions

- `users` table
  - role and status fields support access-control and account lifecycle checks
- `financial_records` table
  - optimized indexes for date/type/category/deleted state
  - soft delete via `deleted_at` to preserve auditability for assignment scope
  - `created_by` foreign key for ownership traceability
- Aggregations are computed in SQL for speed and consistency

## Error Handling and Reliability

- Schema-level and resolver-level validation to reject malformed inputs early
- Consistent, explicit GraphQL error codes
- Auth rejects missing/invalid/expired tokens
- Inactive users are denied access by design

## Project Structure

```text
src/
  auth.js
  config.js
  db.js
  initDb.js
  rbac.js
  resolvers.js
  schema.js
  server.js
  validation.js
tests/
  integration.test.js
```

## Scope and Trade-offs

- SQLite chosen for zero-friction evaluator setup and deterministic local runs
- JWT access-token flow included; refresh-token flow intentionally omitted for assignment scope
- Soft delete implemented for records, not users
- Rate limiting and audit log streaming are natural next extensions

## Render Deployment Notes

If you deploy on Render, use:

- Build command: `npm install`
- Start command: `node src/server.js`

Node runtime is restricted in `package.json` engines to avoid incompatible native binary issues.

### Environment Variables on Render

Set these in Render dashboard:

- `PORT=4000` (Render may override internally)
- `JWT_SECRET=<strong-random-secret>`
- `JWT_EXPIRES_IN=1d`
- `DB_FILE=./data/finance.db`

### Better Log Workflow

1. Use Render Dashboard -> Service -> Logs -> Live tail while reproducing the request.
2. Filter logs by keywords like `Failed to start server`, `SQLITE`, `UNAUTHENTICATED`, `FORBIDDEN`.
3. Add a health check monitor against `/health` to detect boot issues quickly.
4. Keep one successful GraphQL smoke query (`query { __typename }`) for post-deploy validation.

## GitHub Setup And Push

Use the exact commands below:

```bash
git remote add origin https://github.com/cybe4sent1nel/finapi.git
git branch -M main
git push -u origin main
```
