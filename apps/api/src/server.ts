import express from 'express';
import { config } from "@auditpilot/config";

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const port = Number(config.server.port ?? 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
