import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as leaderboardService from '../services/leaderboard.service';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

const querySchema = z.object({
  scope: z.enum(['global', 'friends']).default('global'),
  period: z.enum(['today', 'week', 'month', 'all-time']).default('today'),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/v1/leaderboard
 * Get leaderboard (global or friends)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const query = querySchema.parse(req.query);

    const result = await leaderboardService.getLeaderboard(
      query.scope,
      query.period,
      userId,
      query.limit,
      query.offset
    );

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: error.message || 'Failed to get leaderboard' });
  }
});

export default router;

