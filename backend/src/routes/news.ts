/**
 * News Ingestion Routes
 * 
 * API endpoints for managing news article ingestion
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { NewsIngestionService } from '../services/news-ingestion.service';
import { MockNewsProvider } from '../providers/MockNewsProvider';
import { NewsApiProvider } from '../providers/NewsApiProvider';
import { CryptoPanicProvider } from '../providers/CryptoPanicProvider';

const router = Router();

// Initialize service with providers
const newsService = new NewsIngestionService();

// Register mock provider
newsService.registerProvider(new MockNewsProvider());

// Register NewsAPI provider (requires NEWSAPI_KEY env var)
const newsApiProvider = new NewsApiProvider();
newsService.registerProvider(newsApiProvider);

// Register CryptoPanic provider (requires CRYPTOPANIC_TOKEN env var)
const cryptoPanicProvider = new CryptoPanicProvider();
newsService.registerProvider(cryptoPanicProvider);

/**
 * POST /api/v1/news/ingest
 * Trigger manual ingestion from all providers
 */
router.post('/ingest', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const count = await newsService.ingestFromAllProviders(limit);
    
    res.json({
      success: true,
      articlesIngested: count,
      message: `Successfully ingested ${count} articles`,
    });
  } catch (error: any) {
    console.error('Error during news ingestion:', error);
    res.status(500).json({
      error: 'Failed to ingest news articles',
      details: error.message,
    });
  }
});

/**
 * GET /api/v1/news/articles
 * Get recent articles from database
 */
router.get('/articles', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const source = req.query.source as string | undefined;
    
    const articles = await newsService.getRecentArticles(limit, source);
    
    res.json({
      articles,
      count: articles.length,
    });
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      error: 'Failed to fetch articles',
      details: error.message,
    });
  }
});

/**
 * GET /api/v1/news/stats
 * Get statistics about ingested articles
 */
router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const countBySource = await newsService.getArticleCountBySource();
    
    const totalCount = countBySource.reduce((sum, item) => sum + item.count, 0);
    
    res.json({
      totalArticles: totalCount,
      bySource: countBySource,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/v1/news/cleanup
 * Delete old articles
 */
router.delete('/cleanup', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    const deletedCount = await newsService.deleteOldArticles(days);
    
    res.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} articles older than ${days} days`,
    });
  } catch (error: any) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      error: 'Failed to cleanup old articles',
      details: error.message,
    });
  }
});

export default router;

