/**
 * News Source Repository
 * 
 * Data access layer for managing tracked news sources.
 */

import { prisma } from '../config/database';

export type NewsSourceCategory = 'crypto' | 'macro' | 'tech' | 'politics';

export interface NewsSourceData {
  name: string;
  category: NewsSourceCategory;
  active?: boolean;
}

/**
 * Create a new news source
 */
export async function createNewsSource(data: NewsSourceData) {
  return prisma.newsSource.create({
    data: {
      name: data.name,
      category: data.category,
      active: data.active ?? true,
    },
  });
}

/**
 * Get all news sources
 */
export async function getAllNewsSources() {
  return prisma.newsSource.findMany({
    orderBy: { name: 'asc' },
  });
}

/**
 * Get only active news sources
 */
export async function getActiveNewsSources() {
  return prisma.newsSource.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get news sources by category
 */
export async function getNewsSourcesByCategory(category: NewsSourceCategory) {
  return prisma.newsSource.findMany({
    where: { category },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get a specific news source by name
 */
export async function getNewsSourceByName(name: string) {
  return prisma.newsSource.findUnique({
    where: { name },
  });
}

/**
 * Update a news source
 */
export async function updateNewsSource(name: string, data: Partial<NewsSourceData>) {
  return prisma.newsSource.update({
    where: { name },
    data: {
      ...(data.category && { category: data.category }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });
}

/**
 * Toggle a news source active status
 */
export async function toggleNewsSourceActive(name: string) {
  const source = await getNewsSourceByName(name);
  if (!source) {
    throw new Error(`News source not found: ${name}`);
  }

  return prisma.newsSource.update({
    where: { name },
    data: { active: !source.active },
  });
}

/**
 * Delete a news source
 */
export async function deleteNewsSource(name: string) {
  return prisma.newsSource.delete({
    where: { name },
  });
}

/**
 * Check if a news source is active
 */
export async function isNewsSourceActive(name: string): Promise<boolean> {
  const source = await getNewsSourceByName(name);
  return source?.active ?? false;
}

/**
 * Get statistics by category
 */
export async function getNewsSourceStats() {
  const all = await prisma.newsSource.count();
  const active = await prisma.newsSource.count({ where: { active: true } });
  const byCategory = await prisma.newsSource.groupBy({
    by: ['category'],
    _count: { id: true },
  });

  return {
    total: all,
    active,
    inactive: all - active,
    byCategory: byCategory.map((item) => ({
      category: item.category,
      count: item._count.id,
    })),
  };
}

