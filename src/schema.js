const { buildSchema } = require('graphql');

const schema = buildSchema(`
  enum Role {
    VIEWER
    ANALYST
    ADMIN
  }

  enum UserStatus {
    ACTIVE
    INACTIVE
  }

  enum RecordType {
    INCOME
    EXPENSE
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
    status: UserStatus!
    createdAt: String!
    updatedAt: String!
  }

  type FinancialRecord {
    id: ID!
    amount: Float!
    type: RecordType!
    category: String!
    date: String!
    notes: String
    createdBy: User!
    createdAt: String!
    updatedAt: String!
  }

  type CategoryTotal {
    category: String!
    type: RecordType!
    total: Float!
  }

  type TrendPoint {
    period: String!
    income: Float!
    expense: Float!
    net: Float!
  }

  type DashboardSummary {
    totalIncome: Float!
    totalExpense: Float!
    netBalance: Float!
    categoryTotals: [CategoryTotal!]!
    recentActivity: [FinancialRecord!]!
    trends: [TrendPoint!]!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
    role: Role!
    status: UserStatus
  }

  input UpdateUserInput {
    name: String
    email: String
    password: String
    role: Role
    status: UserStatus
  }

  input RecordFilterInput {
    type: RecordType
    category: String
    startDate: String
    endDate: String
    limit: Int
    offset: Int
  }

  input CreateRecordInput {
    amount: Float!
    type: RecordType!
    category: String!
    date: String!
    notes: String
  }

  input UpdateRecordInput {
    amount: Float
    type: RecordType
    category: String
    date: String
    notes: String
  }

  type Query {
    me: User
    users(role: Role, status: UserStatus, search: String): [User!]!
    records(filter: RecordFilterInput): [FinancialRecord!]!
    dashboardSummary(startDate: String, endDate: String): DashboardSummary!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    setUserStatus(id: ID!, status: UserStatus!): User!

    createRecord(input: CreateRecordInput!): FinancialRecord!
    updateRecord(id: ID!, input: UpdateRecordInput!): FinancialRecord!
    deleteRecord(id: ID!): Boolean!
  }
`);

module.exports = { schema };
