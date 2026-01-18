/**
 * Unit tests for External Post Repository
 */

import { ExternalPost } from '../../interfaces/SocialSourceProvider';
import * as externalPostRepo from '../external-post.repository';
import { prisma } from '../../config/database';

describe('External Post Repository', () => {
  // Clean up before and after tests
  beforeEach(async () => {
    await prisma.externalPost.deleteMany({});
  });

  afterAll(async () => {
    await prisma.externalPost.deleteMany({});
    await prisma.$disconnect();
  });

  describe('insertExternalPosts', () => {
    it('should insert new posts successfully', async () => {
      const posts: ExternalPost[] = [
        {
          platform: 'x',
          author_handle: 'elonmusk',
          content: '$BTC to the moon! 🚀',
          engagement: { likes: 50000, reposts: 10000, replies: 5000, views: 1000000 },
          created_at: new Date('2026-01-17T10:00:00Z'),
          url: 'https://x.com/elonmusk/status/123',
          post_id: '123',
        },
        {
          platform: 'x',
          author_handle: 'michael_saylor',
          content: 'Bitcoin is the future of money.',
          engagement: { likes: 30000, reposts: 5000, replies: 2000, views: 500000 },
          created_at: new Date('2026-01-17T09:00:00Z'),
          url: 'https://x.com/michael_saylor/status/124',
          post_id: '124',
        },
      ];

      const count = await externalPostRepo.insertExternalPosts(posts);

      expect(count).toBe(2);

      // Verify posts are in database
      const dbPosts = await prisma.externalPost.findMany();
      expect(dbPosts).toHaveLength(2);
      expect(dbPosts[0].authorHandle).toBe('elonmusk');
      expect(dbPosts[1].authorHandle).toBe('michael_saylor');
    });

    it('should skip duplicate posts', async () => {
      const post: ExternalPost = {
        platform: 'x',
        author_handle: 'elonmusk',
        content: 'Test post',
        engagement: { likes: 100, reposts: 10, replies: 5, views: 1000 },
        created_at: new Date(),
        post_id: '123',
      };

      // Insert first time
      const count1 = await externalPostRepo.insertExternalPosts([post]);
      expect(count1).toBe(1);

      // Try to insert duplicate
      const count2 = await externalPostRepo.insertExternalPosts([post]);
      expect(count2).toBe(0); // Should skip duplicate

      // Verify only one post in database
      const dbPosts = await prisma.externalPost.findMany();
      expect(dbPosts).toHaveLength(1);
    });

    it('should handle posts without postId', async () => {
      const post: ExternalPost = {
        platform: 'x',
        author_handle: 'testuser',
        content: 'Post without ID',
        engagement: { likes: 0, reposts: 0, replies: 0, views: 0 },
        created_at: new Date(),
      };

      const count = await externalPostRepo.insertExternalPosts([post]);
      expect(count).toBe(1);

      const dbPosts = await prisma.externalPost.findMany();
      expect(dbPosts[0].postId).toBeNull();
    });

    it('should store engagement as JSON string', async () => {
      const post: ExternalPost = {
        platform: 'x',
        author_handle: 'testuser',
        content: 'Test',
        engagement: { likes: 100, reposts: 20, replies: 5, views: 1000 },
        created_at: new Date(),
        post_id: '123',
      };

      await externalPostRepo.insertExternalPosts([post]);

      const dbPost = await prisma.externalPost.findFirst();
      expect(dbPost?.engagement).toBe(JSON.stringify(post.engagement));

      // Verify JSON is valid
      const parsed = JSON.parse(dbPost!.engagement);
      expect(parsed.likes).toBe(100);
      expect(parsed.reposts).toBe(20);
    });
  });

  describe('getRecentExternalPosts', () => {
    beforeEach(async () => {
      // Insert test posts
      await externalPostRepo.insertExternalPosts([
        {
          platform: 'x',
          author_handle: 'user1',
          content: 'Post 1',
          engagement: { likes: 100, reposts: 10, replies: 5, views: 1000 },
          created_at: new Date('2026-01-17T10:00:00Z'),
          post_id: '1',
        },
        {
          platform: 'x',
          author_handle: 'user2',
          content: 'Post 2',
          engagement: { likes: 200, reposts: 20, replies: 10, views: 2000 },
          created_at: new Date('2026-01-17T09:00:00Z'),
          post_id: '2',
        },
        {
          platform: 'other',
          author_handle: 'user3',
          content: 'Post 3',
          engagement: { likes: 300, reposts: 30, replies: 15, views: 3000 },
          created_at: new Date('2026-01-17T08:00:00Z'),
          post_id: '3',
        },
      ]);
    });

    it('should get recent posts', async () => {
      const posts = await externalPostRepo.getRecentExternalPosts(10);
      expect(posts).toHaveLength(3);
      // Should be ordered by publishedAt desc
      expect(posts[0].authorHandle).toBe('user1');
      expect(posts[1].authorHandle).toBe('user2');
      expect(posts[2].authorHandle).toBe('user3');
    });

    it('should filter by platform', async () => {
      const posts = await externalPostRepo.getRecentExternalPosts(10, 'x');
      expect(posts).toHaveLength(2);
      expect(posts.every(p => p.platform === 'x')).toBe(true);
    });

    it('should filter by author handle', async () => {
      const posts = await externalPostRepo.getRecentExternalPosts(10, undefined, 'user1');
      expect(posts).toHaveLength(1);
      expect(posts[0].authorHandle).toBe('user1');
    });

    it('should respect limit', async () => {
      const posts = await externalPostRepo.getRecentExternalPosts(2);
      expect(posts).toHaveLength(2);
    });
  });

  describe('getPostCountByPlatform', () => {
    it('should count posts by platform', async () => {
      await externalPostRepo.insertExternalPosts([
        {
          platform: 'x',
          author_handle: 'user1',
          content: 'X post 1',
          engagement: { likes: 0, reposts: 0, replies: 0, views: 0 },
          created_at: new Date(),
          post_id: '1',
        },
        {
          platform: 'x',
          author_handle: 'user2',
          content: 'X post 2',
          engagement: { likes: 0, reposts: 0, replies: 0, views: 0 },
          created_at: new Date(),
          post_id: '2',
        },
        {
          platform: 'other',
          author_handle: 'user3',
          content: 'IG post 1',
          engagement: { likes: 0, reposts: 0, replies: 0, views: 0 },
          created_at: new Date(),
          post_id: '3',
        },
      ]);

      const counts = await externalPostRepo.getPostCountByPlatform();
      
      const xCount = counts.find(c => c.platform === 'x');
      const otherCount = counts.find(c => c.platform === 'other');
      
      expect(xCount?.count).toBe(2);
      expect(otherCount?.count).toBe(1);
    });
  });

  describe('getTotalEngagementStats', () => {
    it('should calculate total engagement', async () => {
      await externalPostRepo.insertExternalPosts([
        {
          platform: 'x',
          author_handle: 'user1',
          content: 'Post 1',
          engagement: { likes: 100, reposts: 20, replies: 10, views: 1000 },
          created_at: new Date(),
          post_id: '1',
        },
        {
          platform: 'x',
          author_handle: 'user2',
          content: 'Post 2',
          engagement: { likes: 200, reposts: 40, replies: 20, views: 2000 },
          created_at: new Date(),
          post_id: '2',
        },
      ]);

      const stats = await externalPostRepo.getTotalEngagementStats('x');

      expect(stats.totalPosts).toBe(2);
      expect(stats.totalLikes).toBe(300);
      expect(stats.totalReposts).toBe(60);
      expect(stats.totalReplies).toBe(30);
      expect(stats.totalViews).toBe(3000);
      expect(stats.avgLikes).toBe(150);
      expect(stats.avgReposts).toBe(30);
    });
  });

  describe('deleteOldExternalPosts', () => {
    it('should delete old posts', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40); // 40 days ago

      await externalPostRepo.insertExternalPosts([
        {
          platform: 'x',
          author_handle: 'user1',
          content: 'Old post',
          engagement: { likes: 0, reposts: 0, replies: 0, views: 0 },
          created_at: oldDate,
          post_id: '1',
        },
        {
          platform: 'x',
          author_handle: 'user2',
          content: 'New post',
          engagement: { likes: 0, reposts: 0, replies: 0, views: 0 },
          created_at: new Date(),
          post_id: '2',
        },
      ]);

      const deletedCount = await externalPostRepo.deleteOldExternalPosts(30);

      expect(deletedCount).toBe(1);

      const remainingPosts = await prisma.externalPost.findMany();
      expect(remainingPosts).toHaveLength(1);
      expect(remainingPosts[0].authorHandle).toBe('user2');
    });
  });

  describe('externalPostExists', () => {
    it('should check if post exists', async () => {
      await externalPostRepo.insertExternalPosts([
        {
          platform: 'x',
          author_handle: 'user1',
          content: 'Test post',
          engagement: { likes: 0, reposts: 0, replies: 0, views: 0 },
          created_at: new Date(),
          post_id: '123',
        },
      ]);

      const exists = await externalPostRepo.externalPostExists('x', '123');
      expect(exists).toBe(true);

      const notExists = await externalPostRepo.externalPostExists('x', '999');
      expect(notExists).toBe(false);
    });
  });
});

