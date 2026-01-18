/**
 * Narrative Frontend Routes
 * 
 * Optimized API endpoints for frontend consumption
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as frontendService from '../services/narrative-frontend.service';

const router = Router();

/**
 * GET /api/v1/narratives
 * Get narratives list (optimized for frontend)
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).optional(),
      sentiment: z.enum(['bullish', 'bearish', 'neutral']).optional(),
      sortBy: z.enum(['recent', 'popular', 'trending']).optional(),
    });

    const { limit, sentiment, sortBy } = querySchema.parse(req.query);
    const userId = req.userId!;

    const narratives = await frontendService.getNarrativesList(userId, {
      limit,
      sentiment,
      sortBy,
    });

    res.json({
      narratives,
      count: narratives.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch narratives', details: error.message });
  }
});

/**
 * GET /api/v1/narratives/feed
 * Get followed narratives feed
 */
router.get('/feed', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).optional(),
    });

    const { limit } = querySchema.parse(req.query);
    const userId = req.userId!;

    const narratives = await frontendService.getFollowedNarrativesFeed(userId, limit);

    res.json({
      narratives,
      count: narratives.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch feed', details: error.message });
  }
});

/**
 * GET /api/v1/narratives/:id
 * Get narrative detail with articles and timeline
 */
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const narrative = await frontendService.getNarrativeDetail(id, userId);

    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    res.json(narrative);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch narrative', details: error.message });
  }
});

export default router;

