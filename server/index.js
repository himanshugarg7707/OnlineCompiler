import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dbRoutes from './routes/dbRoutes.js';
import executeRoutes from './routes/executeRoutes.js';
import collabRoutes from './routes/collabRoutes.js';
import chatgptRoutes from './routes/chatgptRoutes.js';
import { seedSampleDatabases } from './dbManager.js';
import { chatgptBridge } from './chatgptClassicBridge.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Full Code AI Backend',
  });
});

// Routes - supports both /api/xxx and /xxx for seamless Vercel serverless proxy routing
app.use(['/api/db', '/db'], dbRoutes);
app.use(['/api/execute', '/execute'], executeRoutes);
app.use(['/api/collab', '/collab'], collabRoutes);
app.use(['/api/chatgpt', '/chatgpt'], chatgptRoutes);

// Seed sample databases and start server for local dev
if (!process.env.VERCEL) {
  // Start ChatGPT Classic macOS App Pairing Bridge
  chatgptBridge.init();

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
