import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import dbRoutes from './routes/dbRoutes.js';
import executeRoutes from './routes/executeRoutes.js';
import collabRoutes from './routes/collabRoutes.js';
import terminalRoutes from './routes/terminalRoutes.js';
import fsRoutes from './routes/fsRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import { seedSampleDatabases } from './dbManager.js';
import { checkWorkspaceDatabase, isWorkspaceDatabaseConfigured } from './workspaceStore.js';

const app = express();
const PORT = process.env.PORT || 5001;
const allowedOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin(origin, callback) {
    const allowed = !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) ||
      (origin.endsWith('.vercel.app') && allowedOrigins.includes('https://*.vercel.app'));
    callback(allowed ? null : new Error('This origin is not allowed to access the compiler API.'), allowed);
  },
  allowedHeaders: ['Content-Type', 'X-FullCode-Client-ID'],
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
app.use(['/api/db', '/db'], dbRoutes);
app.use(['/api/execute', '/execute'], executeRoutes);
app.use(['/api/terminal', '/terminal'], terminalRoutes);
app.use(['/api/collab', '/collab'], collabRoutes);
app.use(['/api/fs', '/fs'], fsRoutes);
app.use(['/api/workspaces', '/workspaces'], workspaceRoutes);

// Seed sample databases and start server for local dev
if (!process.env.VERCEL) {
  seedSampleDatabases().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Full Code Backend Server running on http://localhost:${PORT}`);
      console.log(`🗄️ Multi-Database Manager active at /api/db`);
    });
  }).catch((err) => {
    console.warn('Database seed skipped:', err.message);
  });
}

export default app;
