/**
 * Unit tests for NewsApiProvider
 */

import { NewsApiProvider } from '../NewsApiProvider';

// Mock fetch globally
global.fetch = jest.fn();

describe('NewsApiProvider', () => {
  let provider: NewsApiProvider;
  const mockApiKey = 'test-api-key-12345';

  beforeEach(() => {
    provider = new NewsApiProvider(mockApiKey);
    jest.clearAllMocks();
  });

  describe('getSourceName', () => {
    it('should return "newsapi"', () => {
      expect(provider.getSourceName()).toBe('newsapi');
    });
  });

  describe('isAvailable', () => {
    it('should return false if no API key', async () => {
      const providerNoKey = new NewsApiProvider('');
      expect(await providerNoKey.isAvailable()).toBe(false);
    });

    it('should return true if API responds successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', articles: [] }),
      });

      expect(await provider.isAvailable()).toBe(true);
    });

    it('should return false if API fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      expect(await provider.isAvailable()).toBe(false);
    });
  });

  describe('fetchTopHeadlines', () => {
    const mockNewsApiResponse = {
      status: 'ok',
      totalResults: 2,
      articles: [
        {
          source: { id: 'bbc-news', name: 'BBC News' },
          author: 'John Doe',
          title: 'Stock Market Hits Record High',
          description: 'Markets surge on positive data',
          url: 'https://example.com/article1',
          urlToImage: 'https://example.com/image1.jpg',
          publishedAt: '2026-01-17T10:00:00Z',
          content: 'Full article content here [+1234 chars]',
        },
        {
          source: { id: null, name: 'Reuters' },
          author: null,
          title: 'Fed Announces Policy Change',
          description: 'Interest rate decision',
          url: 'https://example.com/article2',
          urlToImage: null,
          publishedAt: '2026-01-17T09:00:00Z',
          content: 'Policy details here',
        },
      ],
    };

    it('should fetch and normalize articles successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNewsApiResponse,
      });

      const articles = await provider.fetchTopHeadlines({
        country: 'us',
        category: 'business',
      });

      expect(articles).toHaveLength(2);
      expect(articles[0]).toEqual({
        source: 'BBC News',
        title: 'Stock Market Hits Record High',
        content: 'Full article content here',
        url: 'https://example.com/article1',
        publishedAt: new Date('2026-01-17T10:00:00Z'),
      });
      expect(articles[1].source).toBe('Reuters');
    });

    it('should include correct query parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', articles: [] }),
      });

      await provider.fetchTopHeadlines({
        country: 'us',
        category: 'business',
        pageSize: 50,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('country=us');
      expect(fetchCall).toContain('category=business');
      expect(fetchCall).toContain('pageSize=50');
      expect(fetchCall).toContain(`apiKey=${mockApiKey}`);
    });

    it('should filter out removed articles', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          articles: [
            {
              ...mockNewsApiResponse.articles[0],
              title: '[Removed]',
              content: null,
            },
            mockNewsApiResponse.articles[1],
          ],
        }),
      });

      const articles = await provider.fetchTopHeadlines({ country: 'us' });
      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('Fed Announces Policy Change');
    });
  });

  describe('fetchEverything', () => {
    it('should search articles with query', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          articles: [
            {
              source: { id: 'techcrunch', name: 'TechCrunch' },
              author: 'Jane Smith',
              title: 'AI Breakthrough Announced',
              description: 'Major development',
              url: 'https://example.com/ai-article',
              urlToImage: null,
              publishedAt: '2026-01-17T08:00:00Z',
              content: 'AI content here',
            },
          ],
        }),
      });

      const articles = await provider.fetchEverything({
        q: 'artificial intelligence',
        language: 'en',
        sortBy: 'publishedAt',
      });

      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('AI Breakthrough Announced');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('q=artificial+intelligence');
      expect(fetchCall).toContain('language=en');
      expect(fetchCall).toContain('sortBy=publishedAt');
    });

    it('should handle date range filters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', articles: [] }),
      });

      await provider.fetchEverything({
        q: 'bitcoin',
        from: '2026-01-01',
        to: '2026-01-17',
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('from=2026-01-01');
      expect(fetchCall).toContain('to=2026-01-17');
    });
  });

  describe('fetchWithRetry', () => {
    it('should retry on rate limit (429)', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({
            status: 'error',
            code: 'rateLimited',
            message: 'Rate limit exceeded',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ok', articles: [] }),
        });

      const articles = await provider.fetchTopHeadlines({ country: 'us' });
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(articles).toEqual([]);
    });

    it('should throw error after max retries', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          status: 'error',
          code: 'rateLimited',
          message: 'Rate limit exceeded',
        }),
      });

      await expect(
        provider.fetchTopHeadlines({ country: 'us' })
      ).rejects.toThrow('NewsAPI error: rateLimited');

      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should retry on network error', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ok', articles: [] }),
        });

      const articles = await provider.fetchTopHeadlines({ country: 'us' });
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(articles).toEqual([]);
    });
  });

  describe('fetchArticles (default)', () => {
    it('should use default configuration', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', articles: [] }),
      });

      await provider.fetchArticles(20);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('country=us');
      expect(fetchCall).toContain('category=business');
      expect(fetchCall).toContain('pageSize=20');
    });

    it('should cap limit at 100', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', articles: [] }),
      });

      await provider.fetchArticles(200);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('pageSize=100');
    });
  });

  describe('normalization', () => {
    it('should clean truncation markers from content', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          articles: [
            {
              source: { id: null, name: 'Test Source' },
              author: null,
              title: 'Test Article',
              description: null,
              url: 'https://example.com/test',
              urlToImage: null,
              publishedAt: '2026-01-17T10:00:00Z',
              content: 'Article text here [+5000 chars]',
            },
          ],
        }),
      });

      const articles = await provider.fetchTopHeadlines({ country: 'us' });
      
      expect(articles[0].content).toBe('Article text here');
      expect(articles[0].content).not.toContain('[+');
    });

    it('should use description if content is null', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          articles: [
            {
              source: { id: null, name: 'Test Source' },
              author: null,
              title: 'Test Article',
              description: 'Description text',
              url: 'https://example.com/test',
              urlToImage: null,
              publishedAt: '2026-01-17T10:00:00Z',
              content: null,
            },
          ],
        }),
      });

      const articles = await provider.fetchTopHeadlines({ country: 'us' });
      
      // Article should still be included since description exists
      expect(articles).toHaveLength(1);
      expect(articles[0].content).toBe('Description text');
    });
  });
});

