/**
 * Extract entities from external posts (X, Twitter, etc.)
 * 
 * This is a one-time batch job or can be run periodically
 * to extract entities from posts that don't have them yet.
 */

import { prisma } from '../config/database';
import * as extractionService from './entity-extraction.service';
import * as entityRepo from '../repositories/article-entity.repository';

/**
 * Extract entities from all external posts without entities
 * 
 * Since external posts use the same ArticleEntity table as news articles,
 * we can reuse the same entity extraction logic.
 * 
 * Note: ArticleEntity.articleId can refer to either NewsArticle.id or ExternalPost.id
 * We differentiate by checking which table has that ID.
 */
export async function extractEntitiesFromPosts(limit?: number): Promise<number> {
  console.log('🔍 Extracting entities from external posts...');
  
  // Get posts without entities
  // We check which posts don't have corresponding entries in ArticleEntity
  const posts = await prisma.externalPost.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`📋 Found ${posts.length} posts to process`);

  let processedCount = 0;

  for (const post of posts) {
    try {
      // Check if entities already extracted
      const existingEntities = await prisma.articleEntity.findFirst({
        where: { articleId: post.id },
      });

      if (existingEntities) {
        continue; // Skip posts that already have entities
      }

      // Extract entities from post content
      // Note: Posts don't have separate titles, so we just use content twice
      const entities = extractionService.extractFromArticle(
        post.content, // Use content as "title"
        post.content, // And as content
        10 // Max 10 keywords
      );

      // Store entities
      await entityRepo.storeArticleEntities(post.id, entities);
      
      processedCount++;
      
      if (processedCount % 10 === 0) {
        console.log(`  ✅ Processed ${processedCount}/${posts.length} posts`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error extracting entities from post ${post.id}:`, error.message);
      // Continue with next post
    }
  }

  console.log(`\n✅ Entity extraction complete: ${processedCount} posts processed`);
  
  return processedCount;
}

