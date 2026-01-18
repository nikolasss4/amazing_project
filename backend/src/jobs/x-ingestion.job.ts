/**
 * Twitter/X Ingestion Job
 * 
 * Fetches posts from tracked X accounts and stores them in the database
 * Uses ThirdPartyXProvider to fetch posts
 */

import { RapidApiXProvider } from '../providers/RapidApiXProvider';
import { MockXProvider } from '../providers/MockXProvider';
import { ThirdPartyXProvider } from '../providers/ThirdPartyXProvider';
import * as trackedAccountRepo from '../repositories/tracked-account.repository';
import * as externalPostRepo from '../repositories/external-post.repository';
import * as extractionService from '../services/entity-extraction.service';
import * as entityRepo from '../repositories/article-entity.repository';

interface IngestionJobConfig {
  postsPerHandle?: number;
  delayBetweenHandles?: number; // ms
}

interface IngestionResult {
  totalHandles: number;
  successfulHandles: number;
  failedHandles: number;
  totalPostsFetched: number;
  totalPostsStored: number;
  errors: Array<{ handle: string; error: string }>;
  details: Array<{ handle: string; fetched: number; stored: number }>;
}

export class XIngestionJob {
  private provider: any; // Can be RapidApiXProvider, MockXProvider, or ThirdPartyXProvider
  private config: Required<IngestionJobConfig>;

  constructor(
    provider?: any,
    config?: IngestionJobConfig
  ) {
    // Using RapidApiXProvider for REAL tweets! 🚀
    this.provider = provider || new RapidApiXProvider();
    this.config = {
      postsPerHandle: config?.postsPerHandle || 20,
      delayBetweenHandles: config?.delayBetweenHandles || 500,
    };
  }

  /**
   * Run ingestion job for all active X accounts
   */
  async run(): Promise<IngestionResult> {
    console.log('🚀 Starting X ingestion job...');
    console.log('⚠️  X ingestion is currently disabled (news-only mode).');
    return {
      totalHandles: 0,
      successfulHandles: 0,
      failedHandles: 0,
      totalPostsFetched: 0,
      totalPostsStored: 0,
      errors: [],
      details: [],
    };

    const startTime = Date.now();
    
    // Check provider availability
    const isAvailable = await this.provider.isAvailable();
    if (!isAvailable) {
      throw new Error('ThirdPartyXProvider is not available. Check X_PROVIDER_BASE_URL and X_PROVIDER_KEY.');
    }

    // Load active tracked X accounts
    const trackedAccounts = await trackedAccountRepo.getActiveTrackedAccounts('x');
    
    if (trackedAccounts.length === 0) {
      console.log('⚠️  No active X accounts to track. Seed some accounts first.');
      return {
        totalHandles: 0,
        successfulHandles: 0,
        failedHandles: 0,
        totalPostsFetched: 0,
        totalPostsStored: 0,
        errors: [],
        details: [],
      };
    }

    console.log(`📋 Found ${trackedAccounts.length} active X accounts`);

    const result: IngestionResult = {
      totalHandles: trackedAccounts.length,
      successfulHandles: 0,
      failedHandles: 0,
      totalPostsFetched: 0,
      totalPostsStored: 0,
      errors: [],
      details: [],
    };

    // Process each account
    for (const account of trackedAccounts) {
      try {
        const handleResult = await this.processHandle(account.accountHandle, account.id);
        
        result.successfulHandles++;
        result.totalPostsFetched += handleResult.fetched;
        result.totalPostsStored += handleResult.stored;
        result.details.push({
          handle: account.accountHandle,
          fetched: handleResult.fetched,
          stored: handleResult.stored,
        });

        console.log(`  ✅ @${account.accountHandle}: ${handleResult.fetched} fetched, ${handleResult.stored} stored`);

      } catch (error: any) {
        result.failedHandles++;
        result.errors.push({
          handle: account.accountHandle,
          error: error.message,
        });

        console.error(`  ❌ @${account.accountHandle}: ${error.message}`);
        // Continue with next handle even if this one fails
      }

      // Delay between handles to avoid rate limits
      if (trackedAccounts.indexOf(account) < trackedAccounts.length - 1) {
        await this.sleep(this.config.delayBetweenHandles);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n📊 Ingestion Summary:');
    console.log(`  • Total handles: ${result.totalHandles}`);
    console.log(`  • Successful: ${result.successfulHandles}`);
    console.log(`  • Failed: ${result.failedHandles}`);
    console.log(`  • Posts fetched: ${result.totalPostsFetched}`);
    console.log(`  • Posts stored: ${result.totalPostsStored}`);
    console.log(`  • Duration: ${duration}s`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(err => {
        console.log(`  • @${err.handle}: ${err.error}`);
      });
    }

    console.log('\n✅ X ingestion job complete!');

    return result;
  }

  /**
   * Process a single handle
   */
  private async processHandle(
    handle: string,
    accountId: string
  ): Promise<{ fetched: number; stored: number }> {
    // Fetch posts from provider
    const posts = await this.provider.fetchRecentPostsByHandle(
      handle,
      this.config.postsPerHandle
    );

    // Store posts in database (idempotent - skips duplicates)
    const storedCount = await externalPostRepo.insertExternalPosts(posts);

    // Update last fetched timestamp
    await trackedAccountRepo.updateLastFetchedAt(accountId, new Date());

    return {
      fetched: posts.length,
      stored: storedCount,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Run ingestion job (for CLI usage)
 */
export async function runXIngestionJob(config?: IngestionJobConfig): Promise<IngestionResult> {
  const job = new XIngestionJob(undefined, config);
  return job.run();
}

