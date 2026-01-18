/**
 * Narrative Metrics Routes
 * 
 * API endpoints for narrative metrics calculation and retrieval
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as metricsService from '../services/narrative-metrics.service';

const router = Router();

/**
 * POST /api/v1/narrative-metrics/calculate
 * Calculate and store metrics for all narratives
 */
router.post('/calculate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configSchema = z.object({
      periods: z.array(z.enum(['1h', '24h'])).optional(),
    });

    const { periods } = configSchema.parse(req.body);

    const result = await metricsService.updateAllNarrativeMetrics(periods);

    res.json({
      success: true,
      calculated: result.calculated,
      stored: result.stored,
      message: `Calculated ${result.calculated} metrics, stored ${result.stored}`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid configuration', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to calculate metrics', details: error.message });
  }
});

/**
 * GET /api/v1/narrative-metrics/:narrativeId
 * Get latest metrics for a specific narrative
 */
router.get('/:narrativeId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { narrativeId } = req.params;

    const metrics = await metricsService.getLatestMetrics(narrativeId);

    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch metrics', details: error.message });
  }
});

/**
 * GET /api/v1/narrative-metrics/trending/list
 * Get trending narratives (highest velocity)
 */
router.get('/trending/list', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const querySchema = z.object({
      period: z.enum(['1h', '24h']).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
    });

    const { period, limit } = querySchema.parse(req.query);

    const trending = await metricsService.getTrendingNarratives(
      period || '24h',
      limit || 10
    );

    res.json({
      trending,
      count: trending.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch trending narratives', details: error.message });
  }
});

/**
 * GET /api/v1/narrative-metrics/most-mentioned/list
 * Get most mentioned narratives
 */
router.get('/most-mentioned/list', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const querySchema = z.object({
      period: z.enum(['1h', '24h']).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
    });

    const { period, limit } = querySchema.parse(req.query);

    const mostMentioned = await metricsService.getMostMentionedNarratives(
      period || '24h',
      limit || 10
    );

    res.json({
      narratives: mostMentioned,
      count: mostMentioned.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch most mentioned narratives', details: error.message });
  }
});

/**
 * DELETE /api/v1/narrative-metrics/cleanup
 * Delete old metrics
 */
router.delete('/cleanup', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const querySchema = z.object({
      daysOld: z.coerce.number().int().min(1).optional(),
    });

    const { daysOld } = querySchema.parse(req.query);

    const deletedCount = await metricsService.cleanupOldMetrics(daysOld || 7);

    res.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} old metrics`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to cleanup metrics', details: error.message });
  }
});

export default router;

