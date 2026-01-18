/**
 * Unit tests for ThirdPartyXProvider
 */

import { ThirdPartyXProvider } from '../ThirdPartyXProvider';

// Mock fetch globally
global.fetch = jest.fn();

describe('ThirdPartyXProvider', () => {
  let provider: ThirdPartyXProvider;
  const mockBaseUrl = 'https://api.testprovider.com/v2';
  const mockApiKey = 'test-api-key-12345';

  beforeEach(() => {
    provider = new ThirdPartyXProvider(mockBaseUrl, mockApiKey);
    jest.clearAllMocks();
  });

  describe('getPlatformName', () => {
    it('should return "x"', () => {
      expect(provider.getPlatformName()).toBe('x');
    });
  });

  describe('isAvailable', () => {
    it('should return false if no base URL', async () => {
      const providerNoUrl = new ThirdPartyXProvider('', mockApiKey);
      expect(await providerNoUrl.isAvailable()).toBe(false);
    });

    it('should return false if no API key', async () => {
      const providerNoKey = new ThirdPartyXProvider(mockBaseUrl, '');
      expect(await providerNoKey.isAvailable()).toBe(false);
    });

    it('should return true if properly configured', async () => {
      expect(await provider.isAvailable()).toBe(true);
    });
  });

  describe('fetchRecentPostsByHandle', () => {
    const mockProviderResponse = {
      success: true,
      data: {
        posts: [
          {
            id: '1234567890',
            text: '$BTC is going to the moon! 🚀 Major institutions are buying.',
            author: {
              username: 'elonmusk',
              handle: 'elonmusk',
            },
            engagement: {
              likes: 50000,
              retweets: 10000,
              replies: 5000,
              views: 1000000,
            },
            created_at: '2026-01-17T10:00:00Z',
            url: 'https://x.com/elonmusk/status/1234567890',
          },
          {
            id: '1234567891',
            text: 'Fed meeting next week. Expecting rate cuts. $TLT looking strong.',
            author: {
              username: 'elonmusk',
            },
            engagement: {
              likes: 30000,
              retweets: 5000,
              replies: 2000,
            },
            created_at: '2026-01-17T09:00:00Z',
            url: 'https://x.com/elonmusk/status/1234567891',
          },
        ],
      },
    };

    it('should fetch and normalize posts successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProviderResponse,
      });

      const posts = await provider.fetchRecentPostsByHandle('elonmusk', 10);

      expect(posts).toHaveLength(2);
      expect(posts[0]).toEqual({
        platform: 'x',
        author_handle: 'elonmusk',
        content: '$BTC is going to the moon! 🚀 Major institutions are buying.',
        engagement: {
          likes: 50000,
          reposts: 10000,
          replies: 5000,
          views: 1000000,
        },
        created_at: new Date('2026-01-17T10:00:00Z'),
        url: 'https://x.com/elonmusk/status/1234567890',
        post_id: '1234567890',
      });
    });

    it('should handle @ symbol in handle', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProviderResponse,
      });

      await provider.fetchRecentPostsByHandle('@elonmusk', 10);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('handle=elonmusk'); // @ removed
    });

    it('should include authorization header', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProviderResponse,
      });

      await provider.fetchRecentPostsByHandle('elonmusk', 10);

      const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchOptions.headers.Authorization).toBe(`Bearer ${mockApiKey}`);
    });

    it('should throw error if handle is empty', async () => {
      await expect(
        provider.fetchRecentPostsByHandle('', 10)
      ).rejects.toThrow('Handle is required');
    });

    it('should handle empty responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      const posts = await provider.fetchRecentPostsByHandle('nobody', 10);
      expect(posts).toEqual([]);
    });

    it('should filter out posts without content', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            posts: [
              {
                id: '1',
                text: 'Valid post',
                author: { username: 'user1' },
                created_at: '2026-01-17T10:00:00Z',
              },
              {
                id: '2',
                text: '',
                author: { username: 'user2' },
                created_at: '2026-01-17T09:00:00Z',
              },
              {
                id: '3',
                text: null,
                author: { username: 'user3' },
                created_at: '2026-01-17T08:00:00Z',
              },
            ],
          },
        }),
      });

      const posts = await provider.fetchRecentPostsByHandle('testuser', 10);
      expect(posts).toHaveLength(1);
      expect(posts[0].content).toBe('Valid post');
    });

    it('should handle missing engagement metrics', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            posts: [
              {
                id: '1',
                text: 'Post without engagement',
                author: { username: 'user1' },
                created_at: '2026-01-17T10:00:00Z',
              },
            ],
          },
        }),
      });

      const posts = await provider.fetchRecentPostsByHandle('testuser', 10);
      expect(posts[0].engagement).toEqual({
        likes: 0,
        reposts: 0,
        replies: 0,
        views: 0,
      });
    });
  });

  describe('fetchWithRetry', () => {
    it('should retry on rate limit (429)', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { posts: [] } }),
        });

      const posts = await provider.fetchRecentPostsByHandle('testuser', 10);
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(posts).toEqual([]);
    });

    it('should throw error after max retries', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      await expect(
        provider.fetchRecentPostsByHandle('testuser', 10)
      ).rejects.toThrow('X provider error: 429');

      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should retry on network error', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('fetch failed: network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { posts: [] } }),
        });

      const posts = await provider.fetchRecentPostsByHandle('testuser', 10);
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(posts).toEqual([]);
    });

    it('should handle non-200 responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      });

      await expect(
        provider.fetchRecentPostsByHandle('testuser', 10)
      ).rejects.toThrow('X provider error: 500');
    });
  });

  describe('normalizePost', () => {
    it('should use fallback handle if author missing', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            posts: [
              {
                id: '1',
                text: 'Post without author',
                created_at: '2026-01-17T10:00:00Z',
              },
            ],
          },
        }),
      });

      const posts = await provider.fetchRecentPostsByHandle('fallbackuser', 10);
      expect(posts[0].author_handle).toBe('fallbackuser');
    });

    it('should handle missing timestamp', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            posts: [
              {
                id: '1',
                text: 'Post without timestamp',
                author: { username: 'user1' },
              },
            ],
          },
        }),
      });

      const posts = await provider.fetchRecentPostsByHandle('testuser', 10);
      expect(posts[0].created_at).toBeInstanceOf(Date);
    });

    it('should handle invalid timestamp', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            posts: [
              {
                id: '1',
                text: 'Post with invalid timestamp',
                author: { username: 'user1' },
                created_at: 'not-a-valid-date',
              },
            ],
          },
        }),
      });

      const posts = await provider.fetchRecentPostsByHandle('testuser', 10);
      expect(posts[0].created_at).toBeInstanceOf(Date);
    });

    it('should normalize retweets to reposts', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            posts: [
              {
                id: '1',
                text: 'Post with retweets',
                author: { username: 'user1' },
                engagement: { retweets: 100 },
                created_at: '2026-01-17T10:00:00Z',
              },
            ],
          },
        }),
      });

      const posts = await provider.fetchRecentPostsByHandle('testuser', 10);
      expect(posts[0].engagement.reposts).toBe(100);
    });
  });

  describe('fetchFromMultipleHandles', () => {
    it('should fetch from multiple handles', async () => {
      const mockResponse1 = {
        success: true,
        data: {
          posts: [
            {
              id: '1',
              text: 'Post from user1',
              author: { username: 'user1' },
              created_at: '2026-01-17T10:00:00Z',
            },
          ],
        },
      };

      const mockResponse2 = {
        success: true,
        data: {
          posts: [
            {
              id: '2',
              text: 'Post from user2',
              author: { username: 'user2' },
              created_at: '2026-01-17T10:00:00Z',
            },
          ],
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      const posts = await provider.fetchFromMultipleHandles(['user1', 'user2'], 10);

      expect(posts).toHaveLength(2);
      expect(posts[0].author_handle).toBe('user1');
      expect(posts[1].author_handle).toBe('user2');
    });

    it('should continue on error for one handle', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              posts: [
                {
                  id: '2',
                  text: 'Post from user2',
                  author: { username: 'user2' },
                  created_at: '2026-01-17T10:00:00Z',
                },
              ],
            },
          }),
        });

      const posts = await provider.fetchFromMultipleHandles(['user1', 'user2'], 10);

      expect(posts).toHaveLength(1);
      expect(posts[0].author_handle).toBe('user2');
    });
  });
});

