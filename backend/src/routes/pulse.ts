import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as pulseService from '../services/pulse.service';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

const querySchema = z.object({
  period: z.enum(['hour', 'day', 'week']).default('day'),
});

/**
 * GET /api/v1/community/pulse
 * Get aggregated community signals
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = querySchema.parse(req.query);

    const result = await pulseService.getCommunityPulse(query.period);

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: error.message || 'Failed to get pulse' });
  }
});

export default router;

