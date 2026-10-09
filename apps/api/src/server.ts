import { config } from '@auditpilot/config';
import app from './app.js';
import { connectMongoDB } from './infrastructure/mongodb.js';

async function startServer() {
  await connectMongoDB();

  const port = config.server.port;

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

startServer();
