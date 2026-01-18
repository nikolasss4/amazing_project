/**
 * CryptoPanic Provider
 *
 * Uses CryptoPanic developer API for crypto news.
 * Requires auth_token via CRYPTOPANIC_TOKEN env var.
 */

import { NewsSourceProvider, NewsArticle } from '../interfaces/NewsSourceProvider';

interface CryptoPanicSource {
  title?: string;
  url?: string;
}

interface CryptoPanicPost {
  id?: number;
  slug?: string;
  title?: string;
  description?: string;
  url?: string;
  published_at?: string;
  created_at?: string;
  kind?: string;
  source?: CryptoPanicSource;
  currencies?: Array<{ code?: string; title?: string }>;
  votes?: { positive?: number; negative?: number; important?: number };
}

interface CryptoPanicResponse {
  results: CryptoPanicPost[];
  next?: string | null;
  previous?: string | null;
}

export class CryptoPanicProvider implements NewsSourceProvider {
  private authToken: string;
  private baseUrl: string;
  private maxRetries = 2;

  constructor(authToken?: string, baseUrl?: string) {
    this.authToken = authToken || process.env.CRYPTOPANIC_TOKEN || '';
    this.baseUrl = baseUrl || process.env.CRYPTOPANIC_BASE_URL || 'https://cryptopanic.com/api/developer/v2';
  }

  getSourceName(): string {
    return 'cryptopanic';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.authToken) return false;
    try {
      const url = `${this.baseUrl}/posts/?auth_token=${this.authToken}`;
      const response = await this.fetchWithRetry(url);
      return Array.isArray(response.results);
    } catch {
      return false;
    }
  }

  async fetchArticles(limit: number = 10): Promise<NewsArticle[]> {
    if (!this.authToken) {
      throw new Error('CRYPTOPANIC_TOKEN is missing');
    }

    const articles: NewsArticle[] = [];
    let nextUrl: string | null = `${this.baseUrl}/posts/?auth_token=${this.authToken}&public=true&kind=news`;

    while (nextUrl && articles.length < limit) {
      const response = await this.fetchWithRetry(nextUrl);
      const batch = this.normalizePosts(response.results);
      articles.push(...batch);

      nextUrl = response.next || null;
      if (!nextUrl) break;
    }

    return articles.slice(0, limit);
  }

  private normalizePosts(posts: CryptoPanicPost[]): NewsArticle[] {
    return (posts || [])
      .filter((post) => post.title && post.published_at)
      .map((post) => {
        // CryptoPanic posts may not have direct URL - construct from slug/id or use source URL
        let url = post.url || post.source?.url || '';
        if (!url && post.slug) {
          url = `https://cryptopanic.com/news/${post.slug}/`;
        }
        if (!url && post.id) {
          url = `https://cryptopanic.com/news/${post.id}/`;
        }
        if (!url) {
          url = `https://cryptopanic.com/news/${Date.now()}/`;
        }
        
        return {
          source: post.source?.title || 'cryptopanic',
          title: post.title || '',
          content: this.buildContent(post),
          url: url,
          publishedAt: new Date(post.published_at || new Date().toISOString()),
        };
      });
  }

  private buildContent(post: CryptoPanicPost): string {
    const title = post.title || '';
    const tickers = (post.currencies || [])
      .map((currency) => currency.code)
      .filter(Boolean)
      .map((code) => `$${code}`)
      .join(' ');

    const sentiment = this.inferSentiment(post.votes);

    const parts = [title, tickers, sentiment ? `Sentiment: ${sentiment}` : ''].filter(Boolean);
    return parts.join(' ');
  }

  private inferSentiment(votes?: { positive?: number; negative?: number; important?: number }): string | null {
    if (!votes) return null;
    const positive = votes.positive || 0;
    const negative = votes.negative || 0;

    if (positive === 0 && negative === 0) return null;
    if (positive > negative) return 'bullish';
    if (negative > positive) return 'bearish';
    return 'neutral';
  }

  private async fetchWithRetry(url: string, attempt: number = 0): Promise<CryptoPanicResponse> {
    try {
      const response = await fetch(url);
      const data = (await response.json()) as CryptoPanicResponse;

      if (!response.ok) {
        if (response.status === 429 && attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
          return this.fetchWithRetry(url, attempt + 1);
        }
        throw new Error(`CryptoPanic error: ${response.status}`);
      }

      return data;
    } catch (error) {
      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await this.sleep(delay);
        return this.fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}


