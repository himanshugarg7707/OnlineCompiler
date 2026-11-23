import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dbRoutes from './routes/dbRoutes.js';
import executeRoutes from './routes/executeRoutes.js';
import collabRoutes from './routes/collabRoutes.js';
import terminalRoutes from './routes/terminalRoutes.js';
import fsRoutes from './routes/fsRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { seedSampleDatabases } from './dbManager.js';
import { checkWorkspaceDatabase, isWorkspaceDatabaseConfigured } from './workspaceStore.js';
import { runMigrations } from './migrations.js';
import { isHostedEnvironment, localMachineOnly } from './hostedMode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 5001;
const allowedOrigins = String(process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173'))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.set('trust proxy', process.env.TRUST_PROXY === 'false' ? false : process.env.NODE_ENV === 'production' ? 1 : false);
app.use(cors({
  origin(origin, callback) {
    const allowed = !origin
      || origin.startsWith('http://localhost')
      || origin.startsWith('http://127.0.0.1')
      || allowedOrigins.length === 0
      || allowedOrigins.includes(origin);
    callback(allowed ? null : new Error('This origin is not allowed to access the compiler API.'), allowed);
  },
  credentials: true,
  allowedHeaders: ['Content-Type'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: process.env.API_BODY_LIMIT || '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get(['/api/health', '/health'], async (req, res) => {
  const workspaceDatabase = isWorkspaceDatabaseConfigured()
    ? await checkWorkspaceDatabase()
    : { configured: false, connected: false };
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Full Code Backend',
    workspaceDatabase,
  });
});

// Routes - supports both /api/xxx and /xxx for seamless Vercel serverless proxy routing
app.use(['/api/db', '/db'], localMachineOnly, dbRoutes);
app.use(['/api/execute', '/execute'], executeRoutes);
app.use(['/api/terminal', '/terminal'], localMachineOnly, terminalRoutes);
app.use(['/api/collab', '/collab'], collabRoutes);
app.use(['/api/fs', '/fs'], localMachineOnly, fsRoutes);
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/workspaces', '/workspaces'], workspaceRoutes);
app.use(['/api/ai', '/ai'], aiRoutes);

// Static frontend serving for production desktop/web distributions
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/db') || req.path.startsWith('/execute') || req.path.startsWith('/health')) {
      return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return next();
  });
}

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status >= 500) console.error('[API] Unhandled request error:', error);
  return res.status(status).json({
    success: false,
    error: status === 500 ? 'The server could not complete this request.' : (error.message || 'Invalid request.'),
  });
});

// Seed sample databases and start server for local dev
if (!process.env.VERCEL) {
  if (!isHostedEnvironment()) {
    seedSampleDatabases().catch((err) => console.warn('Database seed skipped:', err.message));
  }
  if (isWorkspaceDatabaseConfigured()) {
    runMigrations().catch((err) => console.error('Database migration unavailable; local compiler features remain online:', err.message));
  }
  app.listen(PORT, () => {
    console.log(`🚀 Full Code Backend Server running on port ${PORT}`);
    console.log('🗄️ Multi-Database Manager active at /api/db');
  });
}

export default app;
