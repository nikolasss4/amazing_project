import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as feedService from '../services/feed.service';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']).optional(),
  ticker: z.string().optional(),
});

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  tickers: z.array(z.string()).optional(),
});

/**
 * GET /api/v1/feed
 * Get social feed posts
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = querySchema.parse(req.query);

    const result = await feedService.getFeed(
      query.limit,
      query.offset,
      query.sentiment,
      query.ticker
    );

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: error.message || 'Failed to get feed' });
  }
});

/**
 * POST /api/v1/feed
 * Create new post
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const body = createPostSchema.parse(req.body);

    const result = await feedService.createPost(
      userId,
      body.content,
      body.sentiment,
      body.tickers
    );

    res.status(201).json({
      id: result.id,
      success: true,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    res.status(500).json({ error: error.message || 'Failed to create post' });
  }
});

export default router;

