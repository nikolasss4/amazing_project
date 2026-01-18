/**
 * Article Entity Repository
 * 
 * Data access layer for article entities
 */

import { prisma } from '../config/database';
import { EntityType } from '../services/entity-extraction.service';

export interface EntityData {
  entity: string;
  type: EntityType;
}

/**
 * Store entities for an article
 */
export async function storeArticleEntities(
  articleId: string,
  entities: EntityData[]
): Promise<void> {
  // Delete existing entities for this article
  await prisma.articleEntity.deleteMany({
    where: { articleId },
  });

  // Insert new entities
  if (entities.length > 0) {
    await prisma.articleEntity.createMany({
      data: entities.map(e => ({
        articleId,
        entity: e.entity,
        type: e.type,
      })),
    });
  }
}

/**
 * Get entities for a specific article
 */
export async function getArticleEntities(articleId: string) {
  return prisma.articleEntity.findMany({
    where: { articleId },
    orderBy: { type: 'asc' },
  });
}

/**
 * Get entities by type for an article
 */
export async function getArticleEntitiesByType(
  articleId: string,
  type: EntityType
) {
  return prisma.articleEntity.findMany({
    where: { articleId, type },
  });
}

/**
 * Search articles by entity
 */
export async function findArticlesByEntity(entity: string) {
  const entities = await prisma.articleEntity.findMany({
    where: { entity },
    include: {
      article: true,
    },
  });

  return entities.map(e => e.article);
}

/**
 * Get all tickers mentioned across articles
 */
export async function getAllTickers(limit: number = 100) {
  const tickers = await prisma.articleEntity.groupBy({
    by: ['entity'],
    where: { type: 'ticker' },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  });

  return tickers.map(t => ({
    ticker: t.entity,
    count: t._count.id,
  }));
}

/**
 * Get top keywords across all articles
 */
export async function getTopKeywords(limit: number = 50) {
  const keywords = await prisma.articleEntity.groupBy({
    by: ['entity'],
    where: { type: 'keyword' },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  });

  return keywords.map(k => ({
    keyword: k.entity,
    count: k._count.id,
  }));
}

/**
 * Get entity statistics
 */
export async function getEntityStats() {
  const total = await prisma.articleEntity.count();
  const byType = await prisma.articleEntity.groupBy({
    by: ['type'],
    _count: { id: true },
  });

  return {
    total,
    byType: byType.map(t => ({
      type: t.type,
      count: t._count.id,
    })),
  };
}

/**
 * Delete entities for an article
 */
export async function deleteArticleEntities(articleId: string) {
  return prisma.articleEntity.deleteMany({
    where: { articleId },
  });
}

