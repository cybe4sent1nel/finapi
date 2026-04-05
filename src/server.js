const express = require('express');
const cors = require('cors');
const { createHandler } = require('graphql-http/lib/use/express');
const { GraphQLError } = require('graphql');
const { ruruHTML } = require('ruru/server');

const { schema } = require('./schema');
const { root } = require('./resolvers');
const { getUserFromAuthHeader } = require('./auth');
const { initDb } = require('./initDb');
const { PORT } = require('./config');

async function start() {
  await initDb();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'finance-backend' });
  });

  app.get('/graphql', (_req, res) => {
    res.type('html');
    res.end(
      ruruHTML({
        endpoint: '/graphql',
        title: 'Finance Backend GraphQL IDE',
      })
    );
  });

  app.post(
    '/graphql',
    createHandler({
      schema,
      rootValue: root,
      context: async (req) => {
        const user = await getUserFromAuthHeader(req.headers.authorization || '');
        return { user };
      },
      formatError: (error) => {
        const code = error?.extensions?.code || 'INTERNAL_SERVER_ERROR';
        return {
          message: error.message,
          code,
        };
      },
      validationRules: [],
    })
  );

  app.use((err, _req, res, _next) => {
    const status = err instanceof GraphQLError ? 400 : 500;
    res.status(status).json({
      message: err.message || 'Internal server error',
    });
  });

  app.listen(PORT, () => {
    console.log(`Finance backend running on http://localhost:${PORT}/graphql`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
