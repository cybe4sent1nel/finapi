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

  app.get('/', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const graphqlUrl = `${protocol}://${host}/graphql`;

    res.type('html');
    res.send(`
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>finapi</title>
        <style>
          body {
            margin: 0;
            font-family: Segoe UI, Arial, sans-serif;
            background: #f4f7fb;
            color: #1f2937;
          }
          .wrap {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
          }
          .card {
            width: min(700px, 100%);
            background: #ffffff;
            border: 1px solid #dbe3ef;
            border-radius: 14px;
            padding: 28px;
            box-shadow: 0 8px 28px rgba(17, 24, 39, 0.08);
          }
          h1 {
            margin: 0 0 12px;
            font-size: 1.8rem;
          }
          p {
            margin: 0 0 12px;
            line-height: 1.6;
          }
          a {
            color: #0b57d0;
            text-decoration: none;
            font-weight: 600;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <main class="wrap">
          <section class="card">
            <h1>Server running</h1>
            <p>Welcome to <strong>finapi</strong>.</p>
            <p>To experience finapi, visit this link:</p>
            <p><a href="${graphqlUrl}">${graphqlUrl}</a></p>
          </section>
        </main>
      </body>
      </html>
    `);
  });

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
