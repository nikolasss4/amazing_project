/**
 * Social Source Provider Interface
 * 
 * Abstract interface for social media post providers (Twitter/X, etc.)
 * Implementations fetch posts from social platforms via APIs or scraping
 */

export interface ExternalPost {
  platform: 'x' | 'twitter' | 'other';
  author_handle: string;
  content: string;
  engagement: {
    likes?: number;
    reposts?: number;
    replies?: number;
    views?: number;
  };
  created_at: Date;
  url?: string;
  post_id?: string;
}

/**
 * SocialSourceProvider interface
 * All social media providers must implement this interface
 */
export interface SocialSourceProvider {
  /**
   * Unique identifier for the social platform (e.g., 'x', 'twitter')
   */
  getPlatformName(): string;

  /**
   * Fetch recent public posts for a given handle
   * @param handle - Social media handle (without @ symbol)
   * @param limit - Maximum number of posts to fetch
   * @returns Array of external posts
   */
  fetchRecentPostsByHandle(handle: string, limit?: number): Promise<ExternalPost[]>;

  /**
   * Check if the provider is available/configured
   */
  isAvailable(): Promise<boolean>;
}

