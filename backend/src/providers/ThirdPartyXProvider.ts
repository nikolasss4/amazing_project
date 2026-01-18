/**
 * Third-Party X (Twitter) Provider
 * 
 * Fetches X/Twitter posts via third-party API provider
 * This is the ONLY place where X data ingestion happens
 * 
 * Does NOT:
 * - Store data (handled by ingestion service)
 * - Modify narrative logic
 * - Calculate metrics
 */

import { SocialSourceProvider, ExternalPost } from '../interfaces/SocialSourceProvider';

interface ProviderResponse {
  success: boolean;
  data?: {
    posts?: Array<{
      id?: string;
      text?: string;
      author?: {
        username?: string;
        handle?: string;
      };
      engagement?: {
        likes?: number;
        retweets?: number;
        replies?: number;
        views?: number;
      };
      created_at?: string;
      timestamp?: string;
      url?: string;
    }>;
  };
  error?: string;
  message?: string;
}

export class ThirdPartyXProvider implements SocialSourceProvider {
  private baseUrl: string;
  private apiKey: string;
  private maxRetries = 2;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.X_PROVIDER_BASE_URL || '';
    this.apiKey = apiKey || process.env.X_PROVIDER_KEY || '';
  }

  getPlatformName(): string {
    return 'x';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.baseUrl || !this.apiKey) {
      return false;
    }

    try {
      // Simple availability check (no actual API call for MVP)
      return this.baseUrl.startsWith('http') && this.apiKey.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch recent public posts for a given X handle
   * @param handle - X handle (without @ symbol)
   * @param limit - Maximum number of posts to fetch
   * @returns Array of external posts
   */
  async fetchRecentPostsByHandle(handle: string, limit: number = 10): Promise<ExternalPost[]> {
    if (!handle) {
      throw new Error('Handle is required');
    }

    // Normalize handle (remove @ if present)
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    // Build API URL (configurable endpoint)
    const url = this.buildApiUrl(cleanHandle, limit);

    // Fetch with retry logic
    const response = await this.fetchWithRetry(url);

    // Normalize response to ExternalPost format
    return this.normalizeResponse(response, cleanHandle);
  }

  /**
   * Build API URL (configurable for different providers)
   * Override this method for specific provider implementations
   */
  protected buildApiUrl(handle: string, limit: number): string {
    // Default: assume query parameters
    // Specific implementations can override this
    const url = new URL(this.baseUrl);
    url.searchParams.append('handle', handle);
    url.searchParams.append('limit', limit.toString());
    return url.toString();
  }

  /**
   * Fetch with automatic retries on network errors
   */
  private async fetchWithRetry(url: string, attempt: number = 0): Promise<ProviderResponse> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle non-200 responses
      if (!response.ok) {
        // Rate limit - retry after delay
        if (response.status === 429 && attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Rate limited (X provider), retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
          await this.sleep(delay);
          return this.fetchWithRetry(url, attempt + 1);
        }

        // Other HTTP errors
        const errorText = await response.text();
        throw new Error(`X provider error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data as ProviderResponse;
    } catch (error: any) {
      // Network error - retry
      if (attempt < this.maxRetries && error.message.includes('fetch')) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Network error (X provider), retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
        await this.sleep(delay);
        return this.fetchWithRetry(url, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Normalize provider response to ExternalPost format
   */
  private normalizeResponse(response: ProviderResponse, handle: string): ExternalPost[] {
    // Handle empty responses
    if (!response || !response.data || !response.data.posts) {
      console.log(`Empty response from X provider for handle: ${handle}`);
      return [];
    }

    const posts = response.data.posts;

    // Filter and normalize valid posts
    return posts
      .filter(post => {
        // Must have content
        return post.text && post.text.length > 0;
      })
      .map(post => this.normalizePost(post, handle));
  }

  /**
   * Normalize a single post
   */
  private normalizePost(post: any, fallbackHandle: string): ExternalPost {
    // Extract author handle
    const authorHandle = 
      post.author?.username || 
      post.author?.handle || 
      fallbackHandle;

    // Extract timestamp
    const createdAt = this.parseTimestamp(post.created_at || post.timestamp);

    // Extract engagement metrics
    const engagement = {
      likes: post.engagement?.likes || 0,
      reposts: post.engagement?.retweets || post.engagement?.reposts || 0,
      replies: post.engagement?.replies || 0,
      views: post.engagement?.views || 0,
    };

    return {
      platform: 'x',
      author_handle: authorHandle,
      content: post.text || '',
      engagement,
      created_at: createdAt,
      url: post.url,
      post_id: post.id,
    };
  }

  /**
   * Parse timestamp (handle various formats)
   */
  private parseTimestamp(timestamp?: string): Date {
    if (!timestamp) {
      return new Date();
    }

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return new Date();
      }
      return date;
    } catch (error) {
      return new Date();
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch posts from multiple handles (batch operation)
   * Useful for ingesting from multiple tracked accounts
   */
  async fetchFromMultipleHandles(
    handles: string[],
    postsPerHandle: number = 10
  ): Promise<ExternalPost[]> {
    const allPosts: ExternalPost[] = [];

    for (const handle of handles) {
      try {
        const posts = await this.fetchRecentPostsByHandle(handle, postsPerHandle);
        allPosts.push(...posts);

        // Small delay between handles to avoid rate limits
        if (handles.indexOf(handle) < handles.length - 1) {
          await this.sleep(500);
        }
      } catch (error: any) {
        console.error(`Error fetching posts from ${handle}:`, error.message);
        // Continue with other handles even if one fails
      }
    }

    return allPosts;
  }
}

