/**
 * External Posts Repository
 * 
 * Database operations for external social media posts (Twitter/X, etc.)
 */

import { prisma } from '../config/database';
import { ExternalPost } from '../interfaces/SocialSourceProvider';

/**
 * Insert external posts into the database
 * Handles duplicates gracefully (unique constraint on platform + postId)
 * 
 * @param posts - Array of external posts to insert
 * @returns Number of posts successfully inserted
 */
export async function insertExternalPosts(posts: ExternalPost[]): Promise<number> {
  let insertedCount = 0;

  for (const post of posts) {
    try {
      await prisma.externalPost.create({
        data: {
          platform: post.platform,
          authorHandle: post.author_handle,
          content: post.content,
          engagement: JSON.stringify(post.engagement),
          publishedAt: post.created_at,
          url: post.url || null,
          postId: post.post_id || null,
        },
      });
      insertedCount++;
    } catch (error: any) {
      // Skip duplicates (unique constraint on platform + postId)
      if (error.code === 'P2002') {
        console.log(`Duplicate post skipped: ${post.platform}/${post.post_id || 'no-id'}`);
      } else {
        console.error(`Error inserting post from @${post.author_handle}:`, error.message);
      }
    }
  }

  return insertedCount;
}

/**
 * Get recent external posts
 * @param limit - Maximum number of posts to return
 * @param platform - Filter by platform (optional)
 * @param authorHandle - Filter by author handle (optional)
 */
export async function getRecentExternalPosts(
  limit: number = 50,
  platform?: string,
  authorHandle?: string
) {
  return prisma.externalPost.findMany({
    where: {
      ...(platform && { platform }),
      ...(authorHandle && { authorHandle }),
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
}

/**
 * Get external posts by multiple handles
 * @param handles - Array of author handles
 * @param limit - Maximum number of posts per handle
 * @param platform - Filter by platform (default: 'x')
 */
export async function getExternalPostsByHandles(
  handles: string[],
  limit: number = 10,
  platform: string = 'x'
) {
  return prisma.externalPost.findMany({
    where: {
      platform,
      authorHandle: { in: handles },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit * handles.length,
  });
}

/**
 * Get external posts in a time range
 * @param startDate - Start date
 * @param endDate - End date
 * @param platform - Filter by platform (optional)
 */
export async function getExternalPostsByDateRange(
  startDate: Date,
  endDate: Date,
  platform?: string
) {
  return prisma.externalPost.findMany({
    where: {
      ...(platform && { platform }),
      publishedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { publishedAt: 'desc' },
  });
}

/**
 * Get post count by platform
 */
export async function getPostCountByPlatform() {
  const result = await prisma.externalPost.groupBy({
    by: ['platform'],
    _count: {
      id: true,
    },
  });

  return result.map((item) => ({
    platform: item.platform,
    count: item._count.id,
  }));
}

/**
 * Get post count by author
 * @param platform - Filter by platform (optional)
 * @param limit - Maximum number of authors to return
 */
export async function getPostCountByAuthor(platform?: string, limit: number = 20) {
  const result = await prisma.externalPost.groupBy({
    by: ['authorHandle', 'platform'],
    where: platform ? { platform } : undefined,
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
  });

  return result.map((item) => ({
    authorHandle: item.authorHandle,
    platform: item.platform,
    count: item._count.id,
  }));
}

/**
 * Get total engagement stats
 * @param platform - Filter by platform (optional)
 */
export async function getTotalEngagementStats(platform?: string) {
  const posts = await prisma.externalPost.findMany({
    where: platform ? { platform } : undefined,
    select: { engagement: true },
  });

  let totalLikes = 0;
  let totalReposts = 0;
  let totalReplies = 0;
  let totalViews = 0;

  posts.forEach((post) => {
    try {
      const engagement = JSON.parse(post.engagement);
      totalLikes += engagement.likes || 0;
      totalReposts += engagement.reposts || 0;
      totalReplies += engagement.replies || 0;
      totalViews += engagement.views || 0;
    } catch (error) {
      // Skip posts with invalid engagement JSON
    }
  });

  return {
    totalPosts: posts.length,
    totalLikes,
    totalReposts,
    totalReplies,
    totalViews,
    avgLikes: posts.length > 0 ? totalLikes / posts.length : 0,
    avgReposts: posts.length > 0 ? totalReposts / posts.length : 0,
  };
}

/**
 * Delete old external posts
 * @param olderThanDays - Delete posts older than this many days
 * @param platform - Filter by platform (optional)
 * @returns Number of posts deleted
 */
export async function deleteOldExternalPosts(
  olderThanDays: number = 30,
  platform?: string
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await prisma.externalPost.deleteMany({
    where: {
      ...(platform && { platform }),
      publishedAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * Check if a post already exists
 * @param platform - Platform name
 * @param postId - Post ID
 */
export async function externalPostExists(platform: string, postId: string): Promise<boolean> {
  const post = await prisma.externalPost.findUnique({
    where: {
      platform_postId: {
        platform,
        postId,
      },
    },
  });

  return post !== null;
}

