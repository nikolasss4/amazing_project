/**
 * Narrative Metrics Service
 * 
 * Calculate and track narrative metrics:
 * - mention_count: Number of articles linked to the narrative
 * - velocity: % change in mentions compared to previous period
 * 
 * Periods: 1h, 24h
 */

import { prisma } from '../config/database';

export type MetricPeriod = '1h' | '24h';

export interface NarrativeMetricData {
  narrativeId: string;
  period: MetricPeriod;
  mentionCount: number;
  velocity: number;
}

/**
 * Get time range for a metric period
 */
function getTimeRange(period: MetricPeriod): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  if (period === '1h') {
    start.setHours(start.getHours() - 1);
  } else if (period === '24h') {
    start.setHours(start.getHours() - 24);
  }

  return { start, end };
}

/**
 * Get previous period time range (for velocity calculation)
 */
function getPreviousTimeRange(period: MetricPeriod): { start: Date; end: Date } {
  const currentRange = getTimeRange(period);
  const duration = currentRange.end.getTime() - currentRange.start.getTime();

  const end = new Date(currentRange.start);
  const start = new Date(currentRange.start.getTime() - duration);

  return { start, end };
}

/**
 * Calculate mention count for a narrative in a time period
 */
async function calculateMentionCount(
  narrativeId: string,
  start: Date,
  end: Date
): Promise<number> {
  const links = await prisma.detectedNarrativeArticle.findMany({
    where: { narrativeId },
    select: { articleId: true },
  });

  if (links.length === 0) {
    return 0;
  }

  const articleIds = links.map((link) => link.articleId);

  const newsCount = await prisma.newsArticle.count({
    where: {
      id: { in: articleIds },
      publishedAt: {
        gte: start,
        lte: end,
      },
    },
  });

  return newsCount;
}

/**
 * Calculate velocity (% change from previous period)
 */
function calculateVelocity(currentCount: number, previousCount: number): number {
  if (previousCount === 0) {
    return currentCount > 0 ? 100 : 0;
  }

  const change = ((currentCount - previousCount) / previousCount) * 100;
  return Math.round(change * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate metrics for a single narrative and period
 */
export async function calculateNarrativeMetrics(
  narrativeId: string,
  period: MetricPeriod
): Promise<NarrativeMetricData> {
  // Get current period counts
  const currentRange = getTimeRange(period);
  const currentCount = await calculateMentionCount(
    narrativeId,
    currentRange.start,
    currentRange.end
  );

  // Get previous period counts
  const previousRange = getPreviousTimeRange(period);
  const previousCount = await calculateMentionCount(
    narrativeId,
    previousRange.start,
    previousRange.end
  );

  // Calculate velocity
  const velocity = calculateVelocity(currentCount, previousCount);

  return {
    narrativeId,
    period,
    mentionCount: currentCount,
    velocity,
  };
}

/**
 * Calculate metrics for all active narratives
 */
export async function calculateAllNarrativeMetrics(
  periods: MetricPeriod[] = ['1h', '24h']
): Promise<NarrativeMetricData[]> {
  // Get all narratives from the last 7 days (active window)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const narratives = await prisma.detectedNarrative.findMany({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      id: true,
    },
  });

  const metrics: NarrativeMetricData[] = [];

  for (const narrative of narratives) {
    for (const period of periods) {
      try {
        const metric = await calculateNarrativeMetrics(narrative.id, period);
        metrics.push(metric);
      } catch (error) {
        console.error(`Error calculating metrics for narrative ${narrative.id}, period ${period}:`, error);
      }
    }
  }

  return metrics;
}

/**
 * Store metrics in database
 */
export async function storeNarrativeMetrics(
  metrics: NarrativeMetricData[]
): Promise<number> {
  let stored = 0;

  for (const metric of metrics) {
    try {
      await prisma.narrativeMetric.create({
        data: {
          narrativeId: metric.narrativeId,
          period: metric.period,
          mentionCount: metric.mentionCount,
          velocity: metric.velocity,
        },
      });
      stored++;
    } catch (error) {
      console.error(`Error storing metric for narrative ${metric.narrativeId}:`, error);
    }
  }

  return stored;
}

/**
 * Calculate and store metrics for all narratives
 */
export async function updateAllNarrativeMetrics(
  periods: MetricPeriod[] = ['1h', '24h']
): Promise<{ calculated: number; stored: number }> {
  const metrics = await calculateAllNarrativeMetrics(periods);
  const stored = await storeNarrativeMetrics(metrics);

  return {
    calculated: metrics.length,
    stored,
  };
}

/**
 * Get latest metrics for a narrative
 */
export async function getLatestMetrics(narrativeId: string) {
  const metrics = await prisma.narrativeMetric.findMany({
    where: { narrativeId },
    orderBy: { calculatedAt: 'desc' },
    take: 10, // Get last 10 metric snapshots
  });

  // Group by period
  const byPeriod: Record<string, typeof metrics> = {};
  for (const metric of metrics) {
    if (!byPeriod[metric.period]) {
      byPeriod[metric.period] = [];
    }
    byPeriod[metric.period].push(metric);
  }

  return {
    latest: {
      '1h': byPeriod['1h']?.[0] || null,
      '24h': byPeriod['24h']?.[0] || null,
    },
    history: byPeriod,
  };
}

/**
 * Get trending narratives (highest velocity)
 */
export async function getTrendingNarratives(
  period: MetricPeriod = '24h',
  limit: number = 10
) {
  // Get latest metrics for each narrative
  const latestMetrics = await prisma.narrativeMetric.findMany({
    where: {
      period,
      calculatedAt: {
        gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // Last 2 hours
      },
    },
    include: {
      narrative: true,
    },
    orderBy: [
      { velocity: 'desc' },
      { mentionCount: 'desc' },
    ],
    take: limit * 2, // Get more than needed to filter duplicates
  });

  // Deduplicate by narrative (keep highest velocity)
  const seen = new Set<string>();
  const unique = latestMetrics.filter(m => {
    if (seen.has(m.narrativeId)) {
      return false;
    }
    seen.add(m.narrativeId);
    return true;
  });

  return unique.slice(0, limit);
}

/**
 * Get most mentioned narratives
 */
export async function getMostMentionedNarratives(
  period: MetricPeriod = '24h',
  limit: number = 10
) {
  const latestMetrics = await prisma.narrativeMetric.findMany({
    where: {
      period,
      calculatedAt: {
        gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    },
    include: {
      narrative: true,
    },
    orderBy: [
      { mentionCount: 'desc' },
      { velocity: 'desc' },
    ],
    take: limit * 2,
  });

  // Deduplicate
  const seen = new Set<string>();
  const unique = latestMetrics.filter(m => {
    if (seen.has(m.narrativeId)) {
      return false;
    }
    seen.add(m.narrativeId);
    return true;
  });

  return unique.slice(0, limit);
}

/**
 * Clean up old metrics
 */
export async function cleanupOldMetrics(daysOld: number = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.narrativeMetric.deleteMany({
    where: {
      calculatedAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

