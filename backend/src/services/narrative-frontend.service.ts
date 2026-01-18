/**
 * Narrative Frontend Service
 * 
 * Assembles optimized DTOs for frontend consumption.
 * Prevents over-fetching by returning only necessary data.
 */

import { prisma } from '../config/database';

export interface NarrativeListItemDTO {
  id: string;
  title: string;
  summary: string;
  sentiment: string;
  createdAt: Date;
  metrics: {
    '1h'?: {
      mentionCount: number;
      velocity: number;
    };
    '24h'?: {
      mentionCount: number;
      velocity: number;
    };
  };
  stats: {
    articlesCount: number;
    followersCount: number;
  };
  isFollowed: boolean;
}

export interface ArticleTimelineItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: Date;
  entities: {
    tickers: string[];
    people: string[];
    organizations: string[];
  };
}

export interface NarrativeDetailDTO {
  id: string;
  title: string;
  summary: string;
  sentiment: string;
  createdAt: Date;
  updatedAt: Date;
  metrics: {
    '1h'?: {
      mentionCount: number;
      velocity: number;
      calculatedAt: Date;
    };
    '24h'?: {
      mentionCount: number;
      velocity: number;
      calculatedAt: Date;
    };
  };
  stats: {
    articlesCount: number;
    followersCount: number;
  };
  isFollowed: boolean;
  articles: ArticleTimelineItem[];
  timeline: {
    firstArticle: Date;
    lastArticle: Date;
    span: string;
  };
}

/**
 * Get narratives list with optimized data for frontend
 */
export async function getNarrativesList(
  userId: string,
  options: {
    limit?: number;
    sentiment?: string;
    sortBy?: 'recent' | 'popular' | 'trending';
  } = {}
): Promise<NarrativeListItemDTO[]> {
  const { limit = 50, sentiment, sortBy = 'recent' } = options;

  // Build where clause
  const where: any = {};
  if (sentiment) {
    where.sentiment = sentiment;
  }

  // Build order by clause
  let orderBy: any = { createdAt: 'desc' };
  if (sortBy === 'popular') {
    orderBy = { followers: { _count: 'desc' } };
  } else if (sortBy === 'trending') {
    // Will sort by velocity in post-processing
    orderBy = { createdAt: 'desc' };
  }

  // Fetch narratives with counts
  const narratives = await prisma.detectedNarrative.findMany({
    where,
    include: {
      _count: {
        select: {
          articles: true,
          followers: true,
        },
      },
      metrics: {
        orderBy: {
          calculatedAt: 'desc',
        },
        take: 4, // Get latest metrics for both periods
      },
      followers: {
        where: {
          userId,
        },
        select: {
          userId: true,
        },
      },
    },
    orderBy,
    take: limit,
  });

  // Transform to DTOs
  const dtos: NarrativeListItemDTO[] = narratives.map(narrative => {
    // Group metrics by period
    const metrics: NarrativeListItemDTO['metrics'] = {};
    for (const metric of narrative.metrics) {
      if (metric.period === '1h' && !metrics['1h']) {
        metrics['1h'] = {
          mentionCount: metric.mentionCount,
          velocity: metric.velocity,
        };
      } else if (metric.period === '24h' && !metrics['24h']) {
        metrics['24h'] = {
          mentionCount: metric.mentionCount,
          velocity: metric.velocity,
        };
      }
    }

    return {
      id: narrative.id,
      title: narrative.title,
      summary: narrative.summary,
      sentiment: narrative.sentiment,
      createdAt: narrative.createdAt,
      metrics,
      stats: {
        articlesCount: narrative._count.articles,
        followersCount: narrative._count.followers,
      },
      isFollowed: narrative.followers.length > 0,
    };
  });

  // Sort by trending if requested (highest 24h velocity)
  if (sortBy === 'trending') {
    dtos.sort((a, b) => {
      const aVelocity = a.metrics['24h']?.velocity || 0;
      const bVelocity = b.metrics['24h']?.velocity || 0;
      return bVelocity - aVelocity;
    });
  }

  return dtos;
}

/**
 * Get narrative detail with articles and timeline
 */
export async function getNarrativeDetail(
  narrativeId: string,
  userId: string
): Promise<NarrativeDetailDTO | null> {
  const narrative = await prisma.detectedNarrative.findUnique({
    where: { id: narrativeId },
    include: {
      _count: {
        select: {
          articles: true,
          followers: true,
        },
      },
      metrics: {
        orderBy: {
          calculatedAt: 'desc',
        },
        take: 4,
      },
      followers: {
        where: {
          userId,
        },
        select: {
          userId: true,
        },
      },
      articles: {
        include: {
          article: {
            include: {
              entities: {
                select: {
                  entity: true,
                  type: true,
                },
              },
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

  if (!narrative) {
    return null;
  }

  // Group metrics by period
  const metrics: NarrativeDetailDTO['metrics'] = {};
  for (const metric of narrative.metrics) {
    if (metric.period === '1h' && !metrics['1h']) {
      metrics['1h'] = {
        mentionCount: metric.mentionCount,
        velocity: metric.velocity,
        calculatedAt: metric.calculatedAt,
      };
    } else if (metric.period === '24h' && !metrics['24h']) {
      metrics['24h'] = {
        mentionCount: metric.mentionCount,
        velocity: metric.velocity,
        calculatedAt: metric.calculatedAt,
      };
    }
  }

  // Transform articles to timeline items
  const articles: ArticleTimelineItem[] = narrative.articles.map(na => {
    const article = na.article;
    
    // Group entities by type
    const entities = {
      tickers: article.entities.filter(e => e.type === 'ticker').map(e => e.entity),
      people: article.entities.filter(e => e.type === 'person').map(e => e.entity),
      organizations: article.entities.filter(e => e.type === 'org').map(e => e.entity),
    };

    return {
      id: article.id,
      title: article.title,
      source: article.source,
      url: article.url,
      publishedAt: article.publishedAt,
      entities,
    };
  });

  // Calculate timeline
  const publishDates = articles.map(a => a.publishedAt.getTime());
  const firstArticle = new Date(Math.min(...publishDates));
  const lastArticle = new Date(Math.max(...publishDates));
  const spanHours = Math.round((lastArticle.getTime() - firstArticle.getTime()) / (1000 * 60 * 60));
  
  let span: string;
  if (spanHours < 1) {
    span = 'Less than 1 hour';
  } else if (spanHours === 1) {
    span = '1 hour';
  } else if (spanHours < 24) {
    span = `${spanHours} hours`;
  } else {
    const days = Math.round(spanHours / 24);
    span = days === 1 ? '1 day' : `${days} days`;
  }

  return {
    id: narrative.id,
    title: narrative.title,
    summary: narrative.summary,
    sentiment: narrative.sentiment,
    createdAt: narrative.createdAt,
    updatedAt: narrative.updatedAt,
    metrics,
    stats: {
      articlesCount: narrative._count.articles,
      followersCount: narrative._count.followers,
    },
    isFollowed: narrative.followers.length > 0,
    articles,
    timeline: {
      firstArticle,
      lastArticle,
      span,
    },
  };
}

/**
 * Get followed narratives (optimized for feed)
 */
export async function getFollowedNarrativesFeed(
  userId: string,
  limit: number = 20
): Promise<NarrativeListItemDTO[]> {
  const follows = await prisma.narrativeFollower.findMany({
    where: {
      userId,
    },
    include: {
      narrative: {
        include: {
          _count: {
            select: {
              articles: true,
              followers: true,
            },
          },
          metrics: {
            orderBy: {
              calculatedAt: 'desc',
            },
            take: 4,
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return follows.map(follow => {
    const narrative = follow.narrative;
    
    // Group metrics
    const metrics: NarrativeListItemDTO['metrics'] = {};
    for (const metric of narrative.metrics) {
      if (metric.period === '1h' && !metrics['1h']) {
        metrics['1h'] = {
          mentionCount: metric.mentionCount,
          velocity: metric.velocity,
        };
      } else if (metric.period === '24h' && !metrics['24h']) {
        metrics['24h'] = {
          mentionCount: metric.mentionCount,
          velocity: metric.velocity,
        };
      }
    }

    return {
      id: narrative.id,
      title: narrative.title,
      summary: narrative.summary,
      sentiment: narrative.sentiment,
      createdAt: narrative.createdAt,
      metrics,
      stats: {
        articlesCount: narrative._count.articles,
        followersCount: narrative._count.followers,
      },
      isFollowed: true, // Always true for followed narratives
    };
  });
}

