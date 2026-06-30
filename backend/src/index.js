import './config/env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import issueRoutes from './routes/issues.js';
import mapRoutes from './routes/map.js';
import feedRoutes from './routes/feed.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';
import leaderboardRoutes from './routes/leaderboard.js';
import workerRoutes from './routes/worker.js';
import supervisorRoutes from './routes/supervisor.js';
import notificationRoutes from './routes/notifications.js';
import i18nRoutes from './routes/i18n.js';
import { startEscalationCron } from './cron/escalation.js';
import { startWorkerCron } from './cron/worker.js';
import { autoInitDatabase } from './db/autoInit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

autoInitDatabase();

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/init-db', async (_req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ status: 'error', message: 'DATABASE_URL environment variable is missing on Render!' });
    }
    const result = await autoInitDatabase();
    res.json({ status: 'success', message: 'Database initialization check completed', details: result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/', (_req, res) => {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(frontend);
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'Community Hero API',
    health: '/api/health',
    frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/i18n', i18nRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Community Hero API running on http://localhost:${PORT}`);
  startEscalationCron();
  startWorkerCron();
});
