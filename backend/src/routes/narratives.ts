import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as narrativesService from '../services/narratives.service';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']).optional(),
});

/**
 * GET /api/v1/narratives
 * Get active narratives
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = querySchema.parse(req.query);

    const result = await narrativesService.getNarratives(
      query.limit,
      query.offset,
      query.sentiment
    );

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: error.message || 'Failed to get narratives' });
  }
});

/**
 * GET /api/v1/narratives/:id
 * Get single narrative details
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const narrative = await narrativesService.getNarrativeById(id);

    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    res.json(narrative);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get narrative' });
  }
});

export default router;

