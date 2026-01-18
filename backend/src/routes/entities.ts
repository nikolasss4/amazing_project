/**
 * Entity Routes
 * 
 * API endpoints for querying extracted entities
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as entityRepo from '../repositories/article-entity.repository';
import * as extractionService from '../services/entity-extraction.service';

const router = Router();

// ===== Specific routes MUST come before parameterized routes =====

/**
 * GET /api/v1/entities/tickers/all
 * Get all tickers mentioned across articles
 */
router.get('/tickers/all', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limitSchema = z.object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
    });
    
    const { limit } = limitSchema.parse(req.query);
    const tickers = await entityRepo.getAllTickers(limit || 100);
    
    res.json({ tickers, count: tickers.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch tickers', details: error.message });
  }
});

/**
 * GET /api/v1/entities/keywords/top
 * Get top keywords across all articles
 */
router.get('/keywords/top', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limitSchema = z.object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
    });
    
    const { limit } = limitSchema.parse(req.query);
    const keywords = await entityRepo.getTopKeywords(limit || 50);
    
    res.json({ keywords, count: keywords.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to fetch keywords', details: error.message });
  }
});

/**
 * GET /api/v1/entities/stats/all
 * Get entity statistics
 */
router.get('/stats/all', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await entityRepo.getEntityStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

/**
 * GET /api/v1/entities/search
 * Find articles by entity
 */
router.get('/search', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const searchSchema = z.object({
      entity: z.string().min(1),
    });
    
    const { entity } = searchSchema.parse(req.query);
    const articles = await entityRepo.findArticlesByEntity(entity);
    
    res.json({ 
      entity,
      articles,
      count: articles.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to search articles', details: error.message });
  }
});

/**
 * POST /api/v1/entities/extract
 * Test entity extraction on arbitrary text
 */
router.post('/extract', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const extractSchema = z.object({
      text: z.string().min(1),
      maxKeywords: z.number().int().min(1).max(50).optional(),
    });
    
    const { text, maxKeywords } = extractSchema.parse(req.body);
    const entities = extractionService.extractAllEntities(text, maxKeywords || 10);
    
    // Group by type
    const grouped = {
      tickers: entities.filter(e => e.type === 'ticker').map(e => e.entity),
      keywords: entities.filter(e => e.type === 'keyword').map(e => e.entity),
      people: entities.filter(e => e.type === 'person').map(e => e.entity),
      organizations: entities.filter(e => e.type === 'org').map(e => e.entity),
    };
    
    res.json({
      entities: grouped,
      total: entities.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to extract entities', details: error.message });
  }
});

// ===== Parameterized route LAST =====

/**
 * GET /api/v1/entities/:articleId
 * Get all entities for a specific article
 */
router.get('/:articleId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { articleId } = req.params;
    const entities = await entityRepo.getArticleEntities(articleId);
    
    // Group by type for easier consumption
    const grouped = {
      tickers: entities.filter(e => e.type === 'ticker').map(e => e.entity),
      keywords: entities.filter(e => e.type === 'keyword').map(e => e.entity),
      people: entities.filter(e => e.type === 'person').map(e => e.entity),
      organizations: entities.filter(e => e.type === 'org').map(e => e.entity),
    };
    
    res.json({
      articleId,
      entities: grouped,
      total: entities.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch entities', details: error.message });
  }
});

export default router;
