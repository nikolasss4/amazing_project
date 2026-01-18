import { prisma } from '../config/database';
import * as friendsService from './friends.service';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  returnPercent: number;
  winRate: number;
  tradesCount: number;
}

export type LeaderboardScope = 'global' | 'friends';
export type LeaderboardPeriod = 'today' | 'week' | 'month' | 'all-time';

/**
 * Get leaderboard entries
 */
export async function getLeaderboard(
  scope: LeaderboardScope,
  period: LeaderboardPeriod,
  userId?: string,
  limit: number = 100,
  offset: number = 0
): Promise<{ entries: LeaderboardEntry[]; currentUserRank: number | null; total: number }> {
  // Map period to database period format
  const dbPeriod = period === 'all-time' ? 'all_time' : period;

  let userIds: string[] | undefined;

  if (scope === 'friends' && userId) {
    // Get friend IDs
    const friends = await friendsService.getFriends(userId);
    userIds = friends.map((f) => f.id);
    // Include current user in friends leaderboard
    userIds.push(userId);
  }

  // Get total count
  const whereClause: any = {
    period: dbPeriod,
    ...(userIds && { userId: { in: userIds } }),
  };

  const total = await prisma.userMetric.count({ where: whereClause });

  // Get entries ordered by return percent
  const metrics = await prisma.userMetric.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: { returnPercent: 'desc' },
    take: limit,
    skip: offset,
  });

  // Calculate ranks (offset + 1 based on pagination)
  const entries: LeaderboardEntry[] = metrics.map((metric, index) => ({
    rank: offset + index + 1,
    userId: metric.user.id,
    username: metric.user.username,
    returnPercent: Number(metric.returnPercent),
    winRate: Number(metric.winRate),
    tradesCount: metric.tradesCount,
  }));

  // Get current user rank if userId provided
  let currentUserRank: number | null = null;
  if (userId) {
    const userMetric = await prisma.userMetric.findUnique({
      where: {
        userId_period: {
          userId,
          period: dbPeriod,
        },
      },
    });

    if (userMetric) {
      // Count users with higher return percent
      const usersAhead = await prisma.userMetric.count({
        where: {
          period: dbPeriod,
          returnPercent: { gt: userMetric.returnPercent },
          ...(userIds && { userId: { in: userIds } }),
        },
      });

      currentUserRank = usersAhead + 1;
    }
  }

  return { entries, currentUserRank, total };
}

