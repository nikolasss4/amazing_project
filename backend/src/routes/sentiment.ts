/**
 * Sentiment Routes
 * 
 * API endpoints for sentiment classification and analysis
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as sentimentService from '../services/sentiment.service';
import { prisma } from '../config/database';

const router = Router();

/**
 * POST /api/v1/sentiment/classify
 * Test sentiment classification on arbitrary text
 */
router.post('/classify', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const classifySchema = z.object({
      text: z.string().min(1),
      explain: z.boolean().optional(),
    });

    const { text, explain } = classifySchema.parse(req.body);

    if (explain) {
      const result = sentimentService.explainSentiment(text);
      res.json(result);
    } else {
      const sentiment = sentimentService.classifySentiment(text);
      res.json({ sentiment });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to classify sentiment', details: error.message });
  }
});

/**
 * GET /api/v1/sentiment/narratives/stats
 * Get sentiment statistics across all narratives
 */
router.get('/narratives/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const querySchema = z.object({
      period: z.coerce.number().int().min(1).max(168).optional(), // Hours
    });

    const { period } = querySchema.parse(req.query);

    let narratives;
    if (period) {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - period);

      narratives = await prisma.detectedNarrative.findMany({
        where: {
          createdAt: {
            gte: cutoffDate,
          },
        },
        select: {
          sentiment: true,
        },
      });
    } else {
      narratives = await prisma.detectedNarrative.findMany({
        select: {
          sentiment: true,
        },
      });
    }

    const sentiments = narratives.map(n => n.sentiment as sentimentService.Sentiment);
    const stats = sentimentService.getSentimentStats(sentiments);

    res.json(stats);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch sentiment stats', details: error.message });
  }
});

/**
 * GET /api/v1/sentiment/narratives/by-sentiment
 * Get narratives filtered by sentiment
 */
router.get('/narratives/by-sentiment', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const querySchema = z.object({
      sentiment: z.enum(['bullish', 'bearish', 'neutral']),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    });

    const { sentiment, limit } = querySchema.parse(req.query);

    const narratives = await prisma.detectedNarrative.findMany({
      where: {
        sentiment,
      },
      include: {
        _count: {
          select: { articles: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit || 50,
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
 * PATCH /api/v1/sentiment/narratives/:id
 * Manually update sentiment for a narrative
 */
router.patch('/narratives/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const updateSchema = z.object({
      sentiment: z.enum(['bullish', 'bearish', 'neutral']),
    });

    const { sentiment } = updateSchema.parse(req.body);

    const narrative = await prisma.detectedNarrative.update({
      where: { id },
      data: { sentiment },
    });

    res.json({
      success: true,
      narrative,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Narrative not found' });
    }
    res.status(500).json({ error: 'Failed to update sentiment', details: error.message });
  }
});

/**
 * POST /api/v1/sentiment/narratives/recalculate
 * Recalculate sentiment for all narratives
 */
router.post('/narratives/recalculate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const narratives = await prisma.detectedNarrative.findMany({
      select: {
        id: true,
        title: true,
        summary: true,
      },
    });

    let updated = 0;

    for (const narrative of narratives) {
      const sentiment = sentimentService.classifyNarrativeSentiment(
        narrative.title,
        narrative.summary
      );

      await prisma.detectedNarrative.update({
        where: { id: narrative.id },
        data: { sentiment },
      });

      updated++;
    }

    res.json({
      success: true,
      updated,
      message: `Recalculated sentiment for ${updated} narratives`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to recalculate sentiments', details: error.message });
  }
});

export default router;

