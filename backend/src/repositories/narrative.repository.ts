/**
 * Narrative Repository
 * 
 * Data access layer for narratives
 */

import { prisma } from '../config/database';

/**
 * Get all narratives with article count
 */
export async function getAllNarratives(limit: number = 50) {
  return prisma.detectedNarrative.findMany({
    include: {
      articles: {
        include: {
          article: {
            select: {
              id: true,
              title: true,
              source: true,
              publishedAt: true,
            },
          },
        },
      },
      _count: {
        select: { articles: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Get a specific narrative by ID
 */
export async function getNarrativeById(id: string) {
  return prisma.detectedNarrative.findUnique({
    where: { id },
    include: {
      articles: {
        include: {
          article: {
            include: {
              entities: true,
            },
          },
        },
        orderBy: {
          article: {
            publishedAt: 'desc',
          },
        },
      },
    },
  });
}

/**
 * Get narratives created within a time window
 */
export async function getRecentNarratives(hoursAgo: number = 24) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);

  return prisma.detectedNarrative.findMany({
    where: {
      createdAt: {
        gte: cutoffDate,
      },
    },
    include: {
      _count: {
        select: { articles: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Get narrative statistics
 */
export async function getNarrativeStats() {
  const total = await prisma.detectedNarrative.count();
  
  const recentCount = await prisma.detectedNarrative.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  const narrativesWithCounts = await prisma.detectedNarrative.findMany({
    include: {
      _count: {
        select: { articles: true },
      },
    },
  });

  const totalArticlesInNarratives = narrativesWithCounts.reduce(
    (sum, n) => sum + n._count.articles,
    0
  );

  const avgArticlesPerNarrative = total > 0
    ? Math.round(totalArticlesInNarratives / total)
    : 0;

  return {
    total,
    recent24h: recentCount,
    totalArticlesInNarratives,
    avgArticlesPerNarrative,
  };
}

/**
 * Delete old narratives
 */
export async function deleteOldNarratives(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.detectedNarrative.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * Get articles that are part of any narrative
 */
export async function getArticlesInNarratives() {
  return prisma.detectedNarrativeArticle.findMany({
    include: {
      narrative: true,
      article: true,
    },
  });
}

/**
 * Check if an article is part of any narrative
 */
export async function isArticleInNarrative(articleId: string): Promise<boolean> {
  const count = await prisma.detectedNarrativeArticle.count({
    where: { articleId },
  });
  
  return count > 0;
}

