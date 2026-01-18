/**
 * News Source Provider Interface
 * 
 * Abstract interface for news article providers.
 * Implementations can fetch from different sources (APIs, RSS feeds, mock data, etc.)
 */

export interface NewsArticle {
  source: string;
  title: string;
  content: string;
  url: string;
  publishedAt: Date;
}

/**
 * NewsSourceProvider interface
 * All news providers must implement this interface
 */
export interface NewsSourceProvider {
  /**
   * Unique identifier for the news source (e.g., 'reuters', 'bloomberg', 'mock')
   */
  getSourceName(): string;

  /**
   * Fetch recent news articles
   * @param limit - Maximum number of articles to fetch
   * @returns Array of news articles
   */
  fetchArticles(limit?: number): Promise<NewsArticle[]>;

  /**
   * Check if the provider is available/configured
   */
  isAvailable(): Promise<boolean>;
}

