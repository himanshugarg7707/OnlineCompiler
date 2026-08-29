import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dbRoutes from './routes/dbRoutes.js';
import executeRoutes from './routes/executeRoutes.js';
import collabRoutes from './routes/collabRoutes.js';
import { seedSampleDatabases } from './dbManager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Full Code AI Backend',
  });
});

// Routes
app.use('/api/db', dbRoutes);
app.use('/api/execute', executeRoutes);
app.use('/api/collab', collabRoutes);

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
