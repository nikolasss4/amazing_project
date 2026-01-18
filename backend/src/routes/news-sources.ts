/**
 * News Sources Management Routes
 * 
 * API endpoints for managing tracked news sources
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as newsSourceRepo from '../repositories/news-source.repository';

const router = Router();

// Validation schemas
const createSourceSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['crypto', 'macro', 'tech', 'politics']),
  active: z.boolean().optional(),
});

const updateSourceSchema = z.object({
  category: z.enum(['crypto', 'macro', 'tech', 'politics']).optional(),
  active: z.boolean().optional(),
});

/**
 * POST /api/v1/news-sources
 * Create a new news source
 */
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createSourceSchema.parse(req.body);
    
    const source = await newsSourceRepo.createNewsSource(data);
    
    res.status(201).json({
      success: true,
      source,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'News source already exists' });
    }
    res.status(500).json({ error: 'Failed to create news source', details: error.message });
  }
});

/**
 * GET /api/v1/news-sources
 * Get all news sources (or filter by active/category)
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const activeOnly = req.query.active === 'true';
    const category = req.query.category as string | undefined;
    
    let sources;
    
    if (category) {
      sources = await newsSourceRepo.getNewsSourcesByCategory(
        category as newsSourceRepo.NewsSourceCategory
      );
    } else if (activeOnly) {
      sources = await newsSourceRepo.getActiveNewsSources();
    } else {
      sources = await newsSourceRepo.getAllNewsSources();
    }
    
    res.json({
      sources,
      count: sources.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch news sources', details: error.message });
  }
});

/**
 * GET /api/v1/news-sources/stats
 * Get statistics about news sources
 */
router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await newsSourceRepo.getNewsSourceStats();
    
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

/**
 * GET /api/v1/news-sources/:name
 * Get a specific news source
 */
router.get('/:name', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.params;
    
    const source = await newsSourceRepo.getNewsSourceByName(name);
    
    if (!source) {
      return res.status(404).json({ error: 'News source not found' });
    }
    
    res.json({ source });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch news source', details: error.message });
  }
});

/**
 * PATCH /api/v1/news-sources/:name
 * Update a news source
 */
router.patch('/:name', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.params;
    const data = updateSourceSchema.parse(req.body);
    
    const source = await newsSourceRepo.updateNewsSource(name, data);
    
    res.json({
      success: true,
      source,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'News source not found' });
    }
    res.status(500).json({ error: 'Failed to update news source', details: error.message });
  }
});

/**
 * POST /api/v1/news-sources/:name/toggle
 * Toggle a news source's active status
 */
router.post('/:name/toggle', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.params;
    
    const source = await newsSourceRepo.toggleNewsSourceActive(name);
    
    res.json({
      success: true,
      source,
      message: `Source ${name} is now ${source.active ? 'active' : 'inactive'}`,
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'News source not found' });
    }
    res.status(500).json({ error: 'Failed to toggle news source', details: error.message });
  }
});

/**
 * DELETE /api/v1/news-sources/:name
 * Delete a news source
 */
router.delete('/:name', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.params;
    
    await newsSourceRepo.deleteNewsSource(name);
    
    res.json({
      success: true,
      message: `News source ${name} deleted`,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'News source not found' });
    }
    res.status(500).json({ error: 'Failed to delete news source', details: error.message });
  }
});

export default router;

