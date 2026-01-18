/**
 * RapidAPI X (Twitter) Provider
 * 
 * Implements X data fetching via RapidAPI's Twitter API
 * Endpoint: https://twitter154.p.rapidapi.com
 */

import { ExternalPost } from '../interfaces/SocialSourceProvider';
import { ThirdPartyXProvider } from './ThirdPartyXProvider';

interface RapidApiTweet {
  tweet_id?: string;
  text?: string;
  creation_date?: string;
  user?: {
    username?: string;
    screen_name?: string;
  };
  favorite_count?: number;
  retweet_count?: number;
  reply_count?: number;
  view_count?: number;
  lang?: string;
}

interface RapidApiResponse {
  results?: RapidApiTweet[];
  tweets?: RapidApiTweet[];
  data?: RapidApiTweet[];
  error?: string;
  message?: string;
}

export class RapidApiXProvider extends ThirdPartyXProvider {
  private rapidApiHost: string;

  constructor() {
    super();
    this.rapidApiHost = process.env.X_PROVIDER_HOST || 'twitter154.p.rapidapi.com';
  }

  /**
   * Build RapidAPI URL
   * Uses /user/tweets endpoint
   */
  protected buildApiUrl(handle: string, limit: number): string {
    const baseUrl = process.env.X_PROVIDER_BASE_URL || 'https://twitter154.p.rapidapi.com';
    
    // RapidAPI Twitter endpoint format
    return `${baseUrl}/user/tweets?username=${handle}&limit=${limit}`;
  }

  /**
   * Fetch from RapidAPI with proper headers
   */
  protected async fetchWithRetry(url: string, retryCount: number = 0): Promise<any> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': this.rapidApiHost,
        },
      });

      // Handle rate limiting (429)
      if (response.status === 429) {
        if (retryCount < this.maxRetries) {
          const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`Rate limited. Retrying in ${delayMs}ms... (attempt ${retryCount + 1}/${this.maxRetries})`);
          await this.sleep(delayMs);
          return this.fetchWithRetry(url, retryCount + 1);
        } else {
          throw new Error('Rate limit exceeded. Max retries reached.');
        }
      }

      // Handle non-200 responses
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`X provider error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      if (retryCount < this.maxRetries && error.message.includes('fetch')) {
        const delayMs = Math.pow(2, retryCount) * 1000;
        console.log(`Network error. Retrying in ${delayMs}ms...`);
        await this.sleep(delayMs);
        return this.fetchWithRetry(url, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Normalize RapidAPI response to ExternalPost format
   */
  protected normalizeResponse(response: RapidApiResponse, handle: string): ExternalPost[] {
    // RapidAPI can return results in different formats
    const tweets = response.results || response.tweets || response.data || [];

    if (!Array.isArray(tweets)) {
      console.warn(`Unexpected response format for @${handle}`);
      return [];
    }

    return tweets
      .filter((tweet: RapidApiTweet) => tweet && tweet.text)
      .map((tweet: RapidApiTweet) => this.normalizePost(tweet, handle));
  }

  /**
   * Normalize a single tweet to ExternalPost
   */
  private normalizePost(tweet: RapidApiTweet, handle: string): ExternalPost {
    return {
      platform: 'x',
      postId: tweet.tweet_id,
      authorHandle: tweet.user?.username || tweet.user?.screen_name || handle,
      content: tweet.text || '',
      url: tweet.tweet_id ? `https://twitter.com/${handle}/status/${tweet.tweet_id}` : undefined,
      engagement: {
        likes: tweet.favorite_count || 0,
        reposts: tweet.retweet_count || 0,
        replies: tweet.reply_count || 0,
        views: tweet.view_count || 0,
      },
      publishedAt: tweet.creation_date ? new Date(tweet.creation_date) : new Date(),
    };
  }

  /**
   * Sleep utility for retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

