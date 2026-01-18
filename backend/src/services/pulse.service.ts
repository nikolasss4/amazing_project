import { prisma } from '../config/database';

export interface CommunityPulseResponse {
  overallSentiment: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
  topNarrative: {
    id: string;
    title: string;
    discussionCount: number;
  } | null;
  fastestGrowing: {
    id: string;
    title: string;
    velocity: number;
  } | null;
}

/**
 * Get aggregated community pulse signals
 */
export async function getCommunityPulse(
  period: 'hour' | 'day' | 'week' = 'day'
): Promise<CommunityPulseResponse> {
  // Get most recent pulse calculation (overall, not narrative-specific)
  const recentPulse = await prisma.communityPulse.findFirst({
    where: {
      period,
      narrative: null, // Overall pulse (not narrative-specific)
    },
    orderBy: { calculatedAt: 'desc' },
  });

  // Get top narrative by discussion count
  const topNarrative = await prisma.narrative.findFirst({
    where: { status: 'active' },
    orderBy: { mentionCount: 'desc' },
    select: {
      id: true,
      title: true,
      mentionCount: true,
    },
  });

  // Get fastest growing narrative by velocity
  const fastestGrowing = await prisma.narrative.findFirst({
    where: { status: 'active', velocity: { gt: 0 } },
    orderBy: { velocity: 'desc' },
    select: {
      id: true,
      title: true,
      velocity: true,
    },
  });

  return {
    overallSentiment: recentPulse
      ? {
          bullish: Number(recentPulse.bullishPercent),
          bearish: Number(recentPulse.bearishPercent),
          neutral: Number(recentPulse.neutralPercent),
        }
      : {
          bullish: 0,
          bearish: 0,
          neutral: 0,
        },
    topNarrative: topNarrative
      ? {
          id: topNarrative.id,
          title: topNarrative.title,
          discussionCount: topNarrative.mentionCount,
        }
      : null,
    fastestGrowing: fastestGrowing
      ? {
          id: fastestGrowing.id,
          title: fastestGrowing.title,
          velocity: Number(fastestGrowing.velocity),
        }
      : null,
  };
}

