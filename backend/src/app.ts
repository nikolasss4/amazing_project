import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import friendsRouter from './routes/friends';
import leaderboardRouter from './routes/leaderboard';
import narrativesRouter from './routes/narratives';
import feedRouter from './routes/feed';
import pulseRouter from './routes/pulse';
import newsRouter from './routes/news';
import newsSourcesRouter from './routes/news-sources';
import entitiesRouter from './routes/entities';
import narrativesDetectedRouter from './routes/narratives-detected';
import narrativeMetricsRouter from './routes/narrative-metrics';
import sentimentRouter from './routes/sentiment';
import narrativesFrontendRouter from './routes/narratives-frontend';
import communityApiRouter from './routes/community-api';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', communityApiRouter);
app.use('/api/v1/friends', friendsRouter);
app.use('/api/v1/leaderboard', leaderboardRouter);
app.use('/api/v1/narratives', narrativesFrontendRouter); // Frontend-optimized
app.use('/api/v1/narratives-old', narrativesRouter); // Legacy
app.use('/api/v1/narratives-detected', narrativesDetectedRouter); // Admin/detection
app.use('/api/v1/narrative-metrics', narrativeMetricsRouter);
app.use('/api/v1/sentiment', sentimentRouter);
app.use('/api/v1/feed', feedRouter);
app.use('/api/v1/community/pulse', pulseRouter);
app.use('/api/v1/news', newsRouter);
app.use('/api/v1/news-sources', newsSourcesRouter);
app.use('/api/v1/entities', entitiesRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;

