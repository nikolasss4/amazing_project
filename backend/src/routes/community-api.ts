/**
 * Community API Routes (non-versioned)
 *
 * Exposes real backend data for frontend consumption:
 * - GET /api/narratives
 * - POST /api/narratives/:id/follow
 * - POST /api/narratives/:id/fade
 * - GET /api/feed
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as communityService from '../services/community-api.service';
import * as followerRepo from '../repositories/narrative-follower.repository';
import * as marketRoomRepo from '../repositories/market-room.repository';
import { prisma } from '../config/database';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/narratives
 */
router.get('/narratives', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).optional(),
    });

    const { limit } = querySchema.parse(req.query);
    const userId = req.userId!;
    const narratives = await communityService.getCommunityNarratives(userId, limit);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.ts:36',message:'route handler returning',data:{narrativesCount:narratives.length,userId,limit},timestamp:Date.now(),sessionId:'debug-session',runId:'verify-response',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

    res.json(narratives);
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.ts:42',message:'route handler error',data:{error:error.message,userId:req.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'verify-response',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch narratives', details: error.message });
  }
});

/**
 * POST /api/narratives/:id/follow
 */
router.post('/narratives/:id/follow', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    await followerRepo.followNarrative(userId, id);

    res.json({
      success: true,
      narrativeId: id,
    });
  } catch (error: any) {
    if (error.message === 'Already following this narrative') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to follow narrative', details: error.message });
  }
});

/**
 * POST /api/narratives/:id/fade
 * "Fade" is treated as unfollow.
 */
router.post('/narratives/:id/fade', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    await followerRepo.unfollowNarrative(userId, id);

    res.json({
      success: true,
      narrativeId: id,
      faded: true,
    });
  } catch (error: any) {
    if (error.message === 'Not following this narrative') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fade narrative', details: error.message });
  }
});

/**
 * GET /api/feed
 */
router.get('/feed', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
    });

    const { limit } = querySchema.parse(req.query);
    const feed = await communityService.getCommunityFeed(limit);

    res.json(feed);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch feed', details: error.message });
  }
});

/**
 * GET /api/rooms/:narrativeId/messages
 */
router.get('/rooms/:narrativeId/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paramsSchema = z.object({
      narrativeId: z.string().uuid(),
    });
    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
    });

    const { narrativeId } = paramsSchema.parse(req.params);
    const { limit } = querySchema.parse(req.query);

    const narrativeExists = await prisma.detectedNarrative.findUnique({
      where: { id: narrativeId },
      select: { id: true },
    });

    if (!narrativeExists) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    const messages = await marketRoomRepo.getMessagesByNarrativeId(narrativeId, limit);
    res.json(messages);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
  }
});

/**
 * POST /api/rooms/:narrativeId/messages
 */
router.post('/rooms/:narrativeId/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paramsSchema = z.object({
      narrativeId: z.string().uuid(),
    });
    const bodySchema = z.object({
      text: z.string().min(1).max(240),
    });

    const { narrativeId } = paramsSchema.parse(req.params);
    const { text } = bodySchema.parse(req.body);
    const userId = req.userId!;

    const narrativeExists = await prisma.detectedNarrative.findUnique({
      where: { id: narrativeId },
      select: { id: true },
    });

    if (!narrativeExists) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    const message = await marketRoomRepo.createMarketMessage(narrativeId, userId, text.trim());
    res.status(201).json(message);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create message', details: error.message });
  }
});

/**
 * DELETE /api/rooms/:narrativeId/messages/:messageId
 */
router.delete('/rooms/:narrativeId/messages/:messageId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paramsSchema = z.object({
      narrativeId: z.string().uuid(),
      messageId: z.string().uuid(),
    });

    const { narrativeId, messageId } = paramsSchema.parse(req.params);
    const userId = req.userId!;

    const narrativeExists = await prisma.detectedNarrative.findUnique({
      where: { id: narrativeId },
      select: { id: true },
    });

    if (!narrativeExists) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    await marketRoomRepo.deleteMarketMessage(messageId, userId);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid parameters', details: error.errors });
    }
    if (error.message === 'Message not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete message', details: error.message });
  }
});

export default router;

