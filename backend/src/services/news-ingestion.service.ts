/**
 * News Ingestion Service
 * 
 * Fetches news articles from configured providers and stores them in the database.
 * Now checks tracked news sources to only ingest from active sources.
 * Automatically extracts entities (keywords, tickers, people, orgs) from each article.
 */

import { prisma } from '../config/database';
import { NewsSourceProvider, NewsArticle } from '../interfaces/NewsSourceProvider';
import * as newsSourceRepo from '../repositories/news-source.repository';
import * as extractionService from './entity-extraction.service';
import * as entityRepo from '../repositories/article-entity.repository';

export class NewsIngestionService {
  private providers: Map<string, NewsSourceProvider> = new Map();

  /**
   * Register a news source provider
   */
  registerProvider(provider: NewsSourceProvider): void {
    const sourceName = provider.getSourceName();
    this.providers.set(sourceName, provider);
    console.log(`Registered provider: ${sourceName}`);
  }

  /**
   * Ingest articles from all ACTIVE registered providers
   * Only fetches from providers that are marked as active in the database
   * @param limit - Maximum number of articles per provider
   * @returns Number of articles ingested
   */
  async ingestFromAllProviders(limit: number = 10): Promise<number> {
    let totalIngested = 0;

    // Get active sources from database
    const activeSources = await newsSourceRepo.getActiveNewsSources();
    const activeSourceNames = activeSources.map((s) => s.name);

    console.log(`Active sources: ${activeSourceNames.join(', ')}`);

    for (const [sourceName, provider] of this.providers) {
      try {
        // Check if source is active in database
        if (!activeSourceNames.includes(sourceName)) {
          console.log(`Provider ${sourceName} is not active in database, skipping...`);
          continue;
        }

        // Check if provider is available
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          console.log(`Provider ${sourceName} is not available, skipping...`);
          continue;
        }

        const count = await this.ingestFromProvider(provider, limit);
        totalIngested += count;
      } catch (error) {
        console.error(`Error ingesting from ${sourceName}:`, error);
        // Continue with other providers even if one fails
      }
    }

    return totalIngested;
  }

  /**
   * Ingest articles from a specific provider (if active)
   * @param provider - The news source provider
   * @param limit - Maximum number of articles to fetch
   * @returns Number of articles ingested
   */
  async ingestFromProvider(
    provider: NewsSourceProvider,
    limit: number = 10
  ): Promise<number> {
    const sourceName = provider.getSourceName();
    
    // Check if source is active
    const isActive = await newsSourceRepo.isNewsSourceActive(sourceName);
    if (!isActive) {
      console.log(`Source ${sourceName} is not active, skipping ingestion`);
      return 0;
    }

    console.log(`Fetching articles from ${sourceName}...`);

    const articles = await provider.fetchArticles(limit);
    console.log(`Fetched ${articles.length} articles from ${sourceName}`);

    let ingestedCount = 0;

    for (const article of articles) {
      try {
        await this.storeArticle(article);
        ingestedCount++;
      } catch (error: any) {
        // Skip duplicates (unique constraint on URL)
        if (error.code === 'P2002') {
          console.log(`Duplicate article skipped: ${article.url}`);
        } else {
          console.error(`Error storing article: ${article.title}`, error);
        }
      }
    }

    console.log(`Ingested ${ingestedCount} new articles from ${sourceName}`);
    return ingestedCount;
  }

  /**
   * Store a single article in the database and extract entities
   * @param article - The article to store
   */
  private async storeArticle(article: NewsArticle): Promise<void> {
    // Store the article
    const createdArticle = await prisma.newsArticle.create({
      data: {
        source: article.source,
        title: article.title,
        content: article.content,
        url: article.url,
        publishedAt: article.publishedAt,
      },
    });

    // Extract and store entities
    try {
      const entities = extractionService.extractFromArticle(
        article.title,
        article.content,
        10 // Max 10 keywords
      );

      await entityRepo.storeArticleEntities(createdArticle.id, entities);
      
      console.log(`Extracted ${entities.length} entities from: ${article.title}`);
    } catch (error) {
      console.error(`Error extracting entities from article: ${article.title}`, error);
      // Don't fail the ingestion if entity extraction fails
    }
  }

  /**
   * Get recent articles from the database
   * @param limit - Maximum number of articles to return
   * @param source - Filter by source (optional)
   */
  async getRecentArticles(limit: number = 50, source?: string) {
    return prisma.newsArticle.findMany({
      where: source ? { source } : undefined,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get article count by source
   */
  async getArticleCountBySource() {
    const articles = await prisma.newsArticle.groupBy({
      by: ['source'],
      _count: {
        id: true,
      },
    });

    return articles.map((item) => ({
      source: item.source,
      count: item._count.id,
    }));
  }

  /**
   * Delete old articles (cleanup)
   * @param olderThanDays - Delete articles older than this many days
   */
  async deleteOldArticles(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.newsArticle.deleteMany({
      where: {
        publishedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}

