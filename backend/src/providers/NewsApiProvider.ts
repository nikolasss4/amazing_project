/**
 * NewsAPI.org Provider
 * 
 * Real news provider using NewsAPI.org REST API
 * Supports top-headlines and everything endpoints
 * Handles pagination, rate limits, and retries
 */

import { NewsSourceProvider, NewsArticle } from '../interfaces/NewsSourceProvider';

interface NewsApiTopHeadlinesOptions {
  country?: string;
  category?: string;
  sources?: string;
  q?: string;
  pageSize?: number;
  page?: number;
}

interface NewsApiEverythingOptions {
  q: string;
  from?: string;
  to?: string;
  language?: string;
  sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
  pageSize?: number;
  page?: number;
}

interface NewsApiArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

interface NewsApiErrorResponse {
  status: string;
  code: string;
  message: string;
}

export class NewsApiProvider implements NewsSourceProvider {
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';
  private maxRetries = 2;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEWSAPI_KEY || '';
  }

  getSourceName(): string {
    return 'newsapi';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Test with a minimal request
      const response = await fetch(`${this.baseUrl}/top-headlines?country=us&pageSize=1&apiKey=${this.apiKey}`);
      const data = (await response.json()) as NewsApiResponse | NewsApiErrorResponse;
      return 'articles' in data && data.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch articles using default configuration
   * Uses top-headlines for US business news
   */
  async fetchArticles(limit: number = 10): Promise<NewsArticle[]> {
    return this.fetchTopHeadlines({
      country: 'us',
      category: 'business',
      pageSize: Math.min(limit, 100), // NewsAPI max is 100
    });
  }

  /**
   * Fetch top headlines
   * @param options - Filter options for top headlines
   */
  async fetchTopHeadlines(options: NewsApiTopHeadlinesOptions): Promise<NewsArticle[]> {
    const params = new URLSearchParams();
    
    if (options.country) params.append('country', options.country);
    if (options.category) params.append('category', options.category);
    if (options.sources) params.append('sources', options.sources);
    if (options.q) params.append('q', options.q);
    if (options.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options.page) params.append('page', options.page.toString());
    
    params.append('apiKey', this.apiKey);

    const url = `${this.baseUrl}/top-headlines?${params.toString()}`;
    const response = await this.fetchWithRetry(url);
    
    return this.normalizeArticles(response.articles);
  }

  /**
   * Search all articles
   * @param options - Search options
   */
  async fetchEverything(options: NewsApiEverythingOptions): Promise<NewsArticle[]> {
    const params = new URLSearchParams();
    
    params.append('q', options.q);
    if (options.from) params.append('from', options.from);
    if (options.to) params.append('to', options.to);
    if (options.language) params.append('language', options.language);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options.page) params.append('page', options.page.toString());
    
    params.append('apiKey', this.apiKey);

    const url = `${this.baseUrl}/everything?${params.toString()}`;
    const response = await this.fetchWithRetry(url);
    
    return this.normalizeArticles(response.articles);
  }

  /**
   * Fetch with automatic retries on rate limit or network errors
   */
  private async fetchWithRetry(url: string, attempt: number = 0): Promise<NewsApiResponse> {
    try {
      const response = await fetch(url);
      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        const error = data as NewsApiErrorResponse;
        
        // Rate limit - retry after delay
        if (response.status === 429 && attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s
          console.log(`Rate limited, retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
          await this.sleep(delay);
          return this.fetchWithRetry(url, attempt + 1);
        }

        // Other errors
        throw new Error(`NewsAPI error: ${error.code} - ${error.message}`);
      }

      return data as NewsApiResponse;
    } catch (error) {
      // Network error - retry
      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Network error, retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
        await this.sleep(delay);
        return this.fetchWithRetry(url, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Normalize NewsAPI articles to internal format
   */
  private normalizeArticles(articles: NewsApiArticle[]): NewsArticle[] {
    return articles
      .filter(article => {
        // Filter out invalid articles
        // Article must have title, url, publishedAt, and at least content or description
        return (
          article.title &&
          article.url &&
          article.publishedAt &&
          article.title !== '[Removed]' &&
          (article.content !== null || article.description !== null)
        );
      })
      .map(article => ({
        source: article.source.name || 'newsapi',
        title: article.title,
        content: this.cleanContent(article.content || article.description || ''),
        url: article.url,
        publishedAt: new Date(article.publishedAt),
      }));
  }

  /**
   * Clean article content (NewsAPI truncates with [...])
   */
  private cleanContent(content: string): string {
    // Remove truncation markers
    return content.replace(/\[\+\d+ chars\]$/, '').trim();
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch with pagination (multiple pages)
   * Useful for getting more than 100 articles
   */
  async fetchTopHeadlinesWithPagination(
    options: NewsApiTopHeadlinesOptions,
    maxPages: number = 3
  ): Promise<NewsArticle[]> {
    const allArticles: NewsArticle[] = [];
    const pageSize = options.pageSize || 100;

    for (let page = 1; page <= maxPages; page++) {
      const articles = await this.fetchTopHeadlines({
        ...options,
        page,
        pageSize,
      });

      allArticles.push(...articles);

      // Stop if we got fewer articles than requested (no more pages)
      if (articles.length < pageSize) {
        break;
      }

      // Small delay between pages to avoid rate limits
      if (page < maxPages) {
        await this.sleep(500);
      }
    }

    return allArticles;
  }

  /**
   * Fetch everything with pagination
   */
  async fetchEverythingWithPagination(
    options: NewsApiEverythingOptions,
    maxPages: number = 3
  ): Promise<NewsArticle[]> {
    const allArticles: NewsArticle[] = [];
    const pageSize = options.pageSize || 100;

    for (let page = 1; page <= maxPages; page++) {
      const articles = await this.fetchEverything({
        ...options,
        page,
        pageSize,
      });

      allArticles.push(...articles);

      // Stop if we got fewer articles than requested
      if (articles.length < pageSize) {
        break;
      }

      // Small delay between pages
      if (page < maxPages) {
        await this.sleep(500);
      }
    }

    return allArticles;
  }
}

