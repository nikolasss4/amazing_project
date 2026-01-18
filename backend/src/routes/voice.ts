/**
 * Voice Query Routes
 * POST /api/voice/query - Process voice query with screenshot
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as voiceQueryService from '../services/voice-query.service';

const router = Router();

router.use(authMiddleware);

const voiceQuerySchema = z.object({
  screenshotBase64: z.string().min(1, 'Screenshot is required'),
  audioBase64: z.string().optional(), // Optional if transcript is provided
  transcript: z.string().optional(), // Optional if audioBase64 is provided
  page: z.string().optional().default('community'),
}).refine((data) => data.audioBase64 || data.transcript, {
  message: 'Either audioBase64 or transcript must be provided',
});

/**
 * POST /api/voice/query
 */
router.post('/query', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // #region agent log
    console.log('Voice query route called, userId:', req.userId, 'headers:', Object.keys(req.headers).filter(k => k.toLowerCase().includes('user')));
    // #endregion
    
    const body = voiceQuerySchema.parse(req.body);
    
    const result = await voiceQueryService.processVoiceQuery({
      screenshotBase64: body.screenshotBase64,
      audioBase64: body.audioBase64,
      transcript: body.transcript,
      page: body.page,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Voice query route error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.errors });
    }
    
    res.status(500).json({ error: 'Failed to process voice query', details: error.message });
  }
});

export default router;

