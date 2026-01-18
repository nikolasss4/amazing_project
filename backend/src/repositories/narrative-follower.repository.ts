/**
 * Narrative Follower Repository
 * 
 * Data access layer for narrative follow/unfollow functionality
 */

import { prisma } from '../config/database';

/**
 * Follow a narrative
 */
export async function followNarrative(userId: string, narrativeId: string) {
  try {
    return await prisma.narrativeFollower.create({
      data: {
        userId,
        narrativeId,
      },
      include: {
        narrative: true,
      },
    });
  } catch (error: any) {
    // Handle unique constraint violation (already following)
    if (error.code === 'P2002') {
      throw new Error('Already following this narrative');
    }
    throw error;
  }
}

/**
 * Unfollow a narrative
 */
export async function unfollowNarrative(userId: string, narrativeId: string) {
  try {
    return await prisma.narrativeFollower.delete({
      where: {
        userId_narrativeId: {
          userId,
          narrativeId,
        },
      },
    });
  } catch (error: any) {
    // Handle not found
    if (error.code === 'P2025') {
      throw new Error('Not following this narrative');
    }
    throw error;
  }
}

/**
 * Check if user is following a narrative
 */
export async function isFollowing(userId: string, narrativeId: string): Promise<boolean> {
  const follow = await prisma.narrativeFollower.findUnique({
    where: {
      userId_narrativeId: {
        userId,
        narrativeId,
      },
    },
  });

  return follow !== null;
}

/**
 * Get all narratives a user is following
 */
export async function getFollowedNarratives(userId: string) {
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
            take: 2, // Latest 1h and 24h metrics
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return follows.map(f => ({
    ...f.narrative,
    followedAt: f.createdAt,
  }));
}

/**
 * Get followers count for a narrative
 */
export async function getFollowersCount(narrativeId: string): Promise<number> {
  return prisma.narrativeFollower.count({
    where: {
      narrativeId,
    },
  });
}

/**
 * Get followers for a narrative
 */
export async function getNarrativeFollowers(narrativeId: string) {
  return prisma.narrativeFollower.findMany({
    where: {
      narrativeId,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Get most followed narratives
 */
export async function getMostFollowedNarratives(limit: number = 10) {
  const narratives = await prisma.detectedNarrative.findMany({
    include: {
      _count: {
        select: {
          followers: true,
          articles: true,
        },
      },
    },
    orderBy: {
      followers: {
        _count: 'desc',
      },
    },
    take: limit,
  });

  return narratives;
}

/**
 * Get follow statistics for a user
 */
export async function getUserFollowStats(userId: string) {
  const total = await prisma.narrativeFollower.count({
    where: { userId },
  });

  const bySentiment = await prisma.narrativeFollower.groupBy({
    by: ['narrativeId'],
    where: { userId },
    _count: true,
  });

  // Get narratives to check sentiment
  const narrativeIds = bySentiment.map(b => b.narrativeId);
  const narratives = await prisma.detectedNarrative.findMany({
    where: {
      id: {
        in: narrativeIds,
      },
    },
    select: {
      id: true,
      sentiment: true,
    },
  });

  const sentimentMap = new Map(narratives.map(n => [n.id, n.sentiment]));
  
  const sentimentCounts = {
    bullish: 0,
    bearish: 0,
    neutral: 0,
  };

  for (const item of bySentiment) {
    const sentiment = sentimentMap.get(item.narrativeId) as any;
    if (sentiment in sentimentCounts) {
      sentimentCounts[sentiment as keyof typeof sentimentCounts]++;
    }
  }

  return {
    total,
    bySentiment: sentimentCounts,
  };
}

/**
 * Bulk check if user is following multiple narratives
 */
export async function checkFollowingMultiple(
  userId: string,
  narrativeIds: string[]
): Promise<Map<string, boolean>> {
  const follows = await prisma.narrativeFollower.findMany({
    where: {
      userId,
      narrativeId: {
        in: narrativeIds,
      },
    },
    select: {
      narrativeId: true,
    },
  });

  const followingSet = new Set(follows.map(f => f.narrativeId));
  const result = new Map<string, boolean>();

  for (const id of narrativeIds) {
    result.set(id, followingSet.has(id));
  }

  return result;
}

