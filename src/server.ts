import express from 'express';
import { config } from './config';
import postsRoutes from './routes/posts.routes';

const app = express();
app.use(express.json({ limit: '10kb' }));

app.use('/', postsRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    phase: '2',
    timestamp: new Date().toISOString(),
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Health: http://localhost:${config.port}/health`);
  console.log(`POST /api/posts`);
  console.log(`GET /api/posts`);
  console.log(`GET /api/posts/:id`);
});
