import 'dotenv/config';
import express from 'express';
import { config } from './config';
import postsRoutes from './routes/posts.routes';
import variantsRoutes from './routes/variants.routes';
import publishRoutes from './routes/publish.routes';
import schedulerRoutes from './routes/scheduler.routes';
import { schedulerService } from './services/scheduler/scheduler.service';

const app = express();
app.use(express.json({ limit: '10kb' }));

app.use('/', postsRoutes);
app.use('/', variantsRoutes);
app.use('/', publishRoutes);
app.use('/', schedulerRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    phase: '5',
    timestamp: new Date().toISOString(),
    features: ['ingestion', 'generation', 'validation', 'review', 'publishing', 'scheduler'],
    platforms: ['x', 'linkedin', 'telegram'],
    scheduler: schedulerService.getStatus().isRunning ? 'running' : 'stopped',
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- FIX: Declare server variable ---
let server: any;

// --- FIX: Assign app.listen() to server ---
server = app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Health: http://localhost:${config.port}/health`);
  console.log(`POST /api/posts`);
  console.log(`GET /api/posts`);
  console.log(`GET /api/posts/:id`);
  console.log(`POST /api/variants/:id/approve`);
  console.log(`POST /api/variants/:id/reject`);
  console.log(`PATCH /api/variants/:id`);
  console.log(`POST /api/slots`);
  console.log(`POST /api/variants/:id/schedule`);
  console.log(`POST /api/variants/:id/publish`);
  console.log(`GET /api/variants/:id/attempts`);
  console.log(`GET /api/publish/pending`);
  console.log(`GET /api/publish/platforms`);
  console.log(`POST /api/scheduler/start`);
  console.log(`POST /api/scheduler/stop`);
  console.log(`GET /api/scheduler/status`);
  console.log(`POST /api/scheduler/process/:variantId`);

  schedulerService.start();
  console.log(`Scheduler auto-started`);
});

process.on('SIGTERM', () => {
  console.log('\n Received SIGTERM, shutting down gracefully...');
  schedulerService.stop();
  if (server) {
    server.close(() => {
      console.log(' Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('\n Received SIGINT, shutting down gracefully...');
  schedulerService.stop();
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
