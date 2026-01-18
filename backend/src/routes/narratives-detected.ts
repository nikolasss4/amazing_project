/**
 * Narrative Routes
 * 
 * API endpoints for narrative detection, management, and following
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as narrativeRepo from '../repositories/narrative.repository';
import * as narrativeService from '../services/narrative-detection.service';
import * as followerRepo from '../repositories/narrative-follower.repository';

const router = Router();

/**
 * POST /api/v1/narratives/detect
 * Run narrative detection on recent articles
 */
router.post('/detect', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configSchema = z.object({
      minArticles: z.number().int().min(2).max(10).optional(),
      timeWindowHours: z.number().int().min(1).max(168).optional(), // Max 1 week
      minSharedEntities: z.number().int().min(1).max(10).optional(),
    });

    const config = configSchema.parse(req.body);
    
    const result = await narrativeService.runNarrativeDetection(config);
    
    res.json({
      success: true,
      detected: result.detected,
      created: result.created,
      message: `Detected ${result.detected} narratives, created ${result.created} new ones`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid configuration', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to detect narratives', details: error.message });
  }
});

/**
 * GET /api/v1/narratives
 * Get all narratives
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).optional(),
      recent: z.coerce.number().int().min(1).max(168).optional(), // Hours
    });

    const { limit, recent } = querySchema.parse(req.query);

    let narratives;
    if (recent) {
      narratives = await narrativeRepo.getRecentNarratives(recent);
    } else {
      narratives = await narrativeRepo.getAllNarratives(limit || 50);
    }

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
 * GET /api/v1/narratives/stats
 * Get narrative statistics
 */
router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await narrativeRepo.getNarrativeStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

/**
 * GET /api/v1/narratives/:id
 * Get a specific narrative with articles
 */
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const narrative = await narrativeRepo.getNarrativeById(id);
    
    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }
    
    res.json({ narrative });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch narrative', details: error.message });
  }
});

/**
 * DELETE /api/v1/narratives-detected/cleanup
 * Delete old narratives
 */
router.delete('/cleanup', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const querySchema = z.object({
      daysOld: z.coerce.number().int().min(1).optional(),
    });

    const { daysOld } = querySchema.parse(req.query);
    
    const deletedCount = await narrativeRepo.deleteOldNarratives(daysOld || 30);
    
    res.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} old narratives`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to cleanup narratives', details: error.message });
  }
});

// ===== FOLLOWER ROUTES =====

/**
 * GET /api/v1/narratives-detected/following
 * Get all narratives the user is following
 */
router.get('/following', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const narratives = await followerRepo.getFollowedNarratives(userId);

    res.json({
      narratives,
      count: narratives.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch followed narratives', details: error.message });
  }
});

/**
 * GET /api/v1/narratives-detected/following/stats
 * Get user's follow statistics
 */
router.get('/following/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const stats = await followerRepo.getUserFollowStats(userId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch follow stats', details: error.message });
  }
});

/**
 * GET /api/v1/narratives-detected/most-followed
 * Get most followed narratives
 */
router.get('/most-followed', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(50).optional(),
    });

    const { limit } = querySchema.parse(req.query);
    const narratives = await followerRepo.getMostFollowedNarratives(limit || 10);

    res.json({
      narratives: narratives.map(n => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        sentiment: n.sentiment,
        followersCount: n._count.followers,
        articlesCount: n._count.articles,
      })),
      count: narratives.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch most followed narratives', details: error.message });
  }
});

/**
 * POST /api/v1/narratives-detected/:id/follow
 * Follow a narrative
 */
router.post('/:id/follow', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const follow = await followerRepo.followNarrative(userId, id);

    res.json({
      success: true,
      message: 'Successfully followed narrative',
      follow: {
        narrativeId: follow.narrativeId,
        title: follow.narrative.title,
        followedAt: follow.createdAt,
      },
    });
  } catch (error: any) {
    if (error.message === 'Already following this narrative') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to follow narrative', details: error.message });
  }
});

/**
 * POST /api/v1/narratives-detected/:id/unfollow
 * Unfollow a narrative
 */
router.post('/:id/unfollow', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    await followerRepo.unfollowNarrative(userId, id);

    res.json({
      success: true,
      message: 'Successfully unfollowed narrative',
    });
  } catch (error: any) {
    if (error.message === 'Not following this narrative') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to unfollow narrative', details: error.message });
  }
});

/**
 * GET /api/v1/narratives-detected/:id/following
 * Check if user is following a narrative
 */
router.get('/:id/following', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const isFollowing = await followerRepo.isFollowing(userId, id);

    res.json({
      narrativeId: id,
      isFollowing,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to check follow status', details: error.message });
  }
});

/**
 * GET /api/v1/narratives-detected/:id/followers
 * Get followers of a narrative
 */
router.get('/:id/followers', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const followers = await followerRepo.getNarrativeFollowers(id);

    res.json({
      narrativeId: id,
      followers: followers.map(f => ({
        userId: f.user.id,
        username: f.user.username,
        followedAt: f.createdAt,
      })),
      count: followers.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch followers', details: error.message });
  }
});

export default router;

