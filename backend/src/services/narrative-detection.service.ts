/**
 * Narrative Detection Service
 * 
 * Groups articles into narratives based on shared entities/keywords.
 * A narrative is a repeated market story - requires multiple articles with common themes.
 * Now includes sentiment classification.
 * 
 * Detection rules:
 * - Articles must share significant entities (tickers, people, orgs) or keywords
 * - Must cross threshold (e.g., 3 articles within 24 hours)
 * - Deterministic grouping (no randomness)
 */

import { prisma } from '../config/database';
import * as sentimentService from './sentiment.service';

export interface NarrativeConfig {
  minArticles: number;      // Minimum articles to form narrative (default: 3)
  timeWindowHours: number;  // Time window in hours (default: 24)
  minSharedEntities: number; // Minimum shared entities (default: 2)
}

export interface ArticleCluster {
  articles: Array<{
    id: string;
    title: string;
    publishedAt: Date;
  }>;
  sharedEntities: string[];
  entityType: string;
}

export interface DetectedNarrative {
  title: string;
  summary: string;
  sentiment: sentimentService.Sentiment;
  articleIds: string[];
  sharedEntities: string[];
}

const DEFAULT_CONFIG: NarrativeConfig = {
  minArticles: 3,
  timeWindowHours: 24,
  minSharedEntities: 2,
};

/**
 * Group articles by shared entities
 * Returns clusters of articles that share significant entities
 *
 * News-only mode: excludes external posts
 */
export async function groupArticlesByEntities(
  timeWindowHours: number = 24,
  minSharedEntities: number = 2
): Promise<ArticleCluster[]> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - timeWindowHours);

  // Get recent articles with their entities
  const articles = await prisma.newsArticle.findMany({
    where: {
      publishedAt: {
        gte: cutoffDate,
      },
    },
    orderBy: {
      publishedAt: 'desc',
    },
  });

  // Get entities for articles
  const articleIds = articles.map(a => a.id);
  const articleEntities = await prisma.articleEntity.findMany({
    where: {
      articleId: { in: articleIds },
    },
  });

  // Map entities by article ID
  const entitiesByArticleId = new Map<string, typeof articleEntities>();
  articleEntities.forEach(entity => {
    if (!entitiesByArticleId.has(entity.articleId)) {
      entitiesByArticleId.set(entity.articleId, []);
    }
    entitiesByArticleId.get(entity.articleId)!.push(entity);
  });

  // Combine articles and posts into a unified format
  const allContent = [
    ...articles.map(a => ({
      id: a.id,
      title: a.title,
      publishedAt: a.publishedAt,
      entities: entitiesByArticleId.get(a.id) || [],
    })),
  ];

  if (allContent.length < 2) {
    return [];
  }

  // Group by significant entity types (tickers, people, orgs - not keywords)
  const significantTypes = ['ticker', 'person', 'org'];
  
  // Create entity -> articles mapping
  const entityToArticles = new Map<string, Set<string>>();
  const contentMap = new Map<string, typeof allContent[0]>();

  for (const content of allContent) {
    contentMap.set(content.id, content);
    
    for (const entity of content.entities) {
      if (significantTypes.includes(entity.type)) {
        const key = `${entity.type}:${entity.entity}`;
        
        if (!entityToArticles.has(key)) {
          entityToArticles.set(key, new Set());
        }
        entityToArticles.get(key)!.add(content.id);
      }
    }
  }

  // Find clusters (groups of content sharing entities)
  const clusters: ArticleCluster[] = [];
  const processedContent = new Set<string>();

  // Sort entities by number of content items (most common first)
  const sortedEntities = Array.from(entityToArticles.entries())
    .sort((a, b) => b[1].size - a[1].size);

  for (const [entityKey, contentIds] of sortedEntities) {
    if (contentIds.size < minSharedEntities) {
      continue;
    }

    // Skip if all content already processed
    const unprocessedContent = Array.from(contentIds)
      .filter(id => !processedContent.has(id));
    
    if (unprocessedContent.length < minSharedEntities) {
      continue;
    }

    // Find all entities shared by these content items
    const sharedEntities = new Set<string>();
    
    for (const [otherEntityKey, otherContentIds] of entityToArticles.entries()) {
      // Check if this entity is shared by at least 2 content items in the cluster
      const intersection = unprocessedContent.filter(id => otherContentIds.has(id));
      if (intersection.length >= 2) {
        const [type, entity] = otherEntityKey.split(':');
        sharedEntities.add(entity);
      }
    }

    if (sharedEntities.size >= minSharedEntities) {
      const clusterContent = unprocessedContent
        .map(id => contentMap.get(id)!)
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

      const [primaryType] = entityKey.split(':');

      clusters.push({
        articles: clusterContent.map(c => ({
          id: c.id,
          title: c.title,
          publishedAt: c.publishedAt,
        })),
        sharedEntities: Array.from(sharedEntities).sort(),
        entityType: primaryType,
      });

      // Mark content as processed
      unprocessedContent.forEach(id => processedContent.add(id));
    }
  }

  return clusters;
}

/**
 * Generate narrative title from shared entities
 */
function generateNarrativeTitle(
  cluster: ArticleCluster
): string {
  const entities = cluster.sharedEntities.slice(0, 3); // Top 3 entities
  
  if (cluster.entityType === 'ticker') {
    const tickers = entities.filter(e => e.startsWith('$'));
    if (tickers.length > 0) {
      return `${tickers.join(', ')} Market Movement`;
    }
  }
  
  if (cluster.entityType === 'person') {
    const person = entities[0];
    return `${person} Developments`;
  }
  
  if (cluster.entityType === 'org') {
    const org = entities[0];
    return `${org} News`;
  }
  
  // Fallback
  return `${entities.join(', ')} Updates`;
}

/**
 * Generate narrative summary from articles
 */
function generateNarrativeSummary(
  cluster: ArticleCluster
): string {
  const count = cluster.articles.length;
  const entities = cluster.sharedEntities.slice(0, 5);
  
  const entityList = entities.length > 3
    ? `${entities.slice(0, 3).join(', ')} and ${entities.length - 3} more`
    : entities.join(', ');
  
  const timeSpan = getTimeSpan(
    cluster.articles[cluster.articles.length - 1].publishedAt,
    cluster.articles[0].publishedAt
  );
  
  return `${count} articles discussing ${entityList} ${timeSpan}`;
}

/**
 * Get human-readable time span
 */
function getTimeSpan(start: Date, end: Date): string {
  const diffHours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    return 'in the last hour';
  } else if (diffHours === 1) {
    return 'in the last hour';
  } else if (diffHours < 24) {
    return `over the last ${diffHours} hours`;
  } else {
    const days = Math.floor(diffHours / 24);
    return `over the last ${days} day${days > 1 ? 's' : ''}`;
  }
}

/**
 * Detect narratives from recent articles
 * Returns narratives that meet the threshold criteria
 */
export async function detectNarratives(
  config: Partial<NarrativeConfig> = {}
): Promise<DetectedNarrative[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Group articles by shared entities
  const clusters = await groupArticlesByEntities(
    cfg.timeWindowHours,
    cfg.minSharedEntities
  );
  
  // Filter clusters that meet minimum article threshold
  const narrativeClusters = clusters.filter(
    cluster => cluster.articles.length >= cfg.minArticles
  );
  
  // Generate narratives with sentiment classification
  const narratives: DetectedNarrative[] = narrativeClusters.map(cluster => {
    const title = generateNarrativeTitle(cluster);
    const summary = generateNarrativeSummary(cluster);
    const sentiment = sentimentService.classifyNarrativeSentiment(title, summary);
    
    return {
      title,
      summary,
      sentiment,
      articleIds: cluster.articles.map(a => a.id),
      sharedEntities: cluster.sharedEntities,
    };
  });
  
  return narratives;
}

/**
 * Create narratives in database from detected narratives
 */
export async function createNarratives(
  detectedNarratives: DetectedNarrative[]
): Promise<number> {
  let created = 0;
  
  for (const narrative of detectedNarratives) {
    // Check if narrative already exists for these articles
    const existingNarrative = await prisma.detectedNarrative.findFirst({
      where: {
        articles: {
          some: {
            articleId: {
              in: narrative.articleIds,
            },
          },
        },
      },
      include: {
        articles: true,
      },
    });
    
    // If narrative exists and has same articles, skip
    if (existingNarrative) {
      const existingArticleIds = new Set(
        existingNarrative.articles.map(a => a.articleId)
      );
      const sameArticles = narrative.articleIds.every(id => existingArticleIds.has(id))
        && existingArticleIds.size === narrative.articleIds.length;
      
      if (sameArticles) {
        continue;
      }
    }
    
    // Create new narrative
    await prisma.detectedNarrative.create({
      data: {
        title: narrative.title,
        summary: narrative.summary,
        sentiment: narrative.sentiment,
        articles: {
          create: narrative.articleIds.map(articleId => ({
            articleId,
          })),
        },
      },
    });
    
    created++;
  }
  
  return created;
}

/**
 * Run full narrative detection and creation
 */
export async function runNarrativeDetection(
  config: Partial<NarrativeConfig> = {}
): Promise<{ detected: number; created: number }> {
  const detected = await detectNarratives(config);
  const created = await createNarratives(detected);
  
  return {
    detected: detected.length,
    created,
  };
}

