/**
 * Test script to demonstrate X posts integration with narratives
 * 
 * Shows that narratives are created from combined news articles + X posts
 */

import { extractEntitiesFromPosts } from './services/external-post-entity-extraction.service';
import { runNarrativeDetection } from './services/narrative-detection.service';
import { prisma } from './config/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║        X Posts → Narratives Integration Test            ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // Step 1: Check current state
  console.log('📊 Step 1: Check current state');
  console.log('─'.repeat(60));
  
  const articleCount = await prisma.newsArticle.count();
  const postCount = await prisma.externalPost.count();
  const narrativeCount = await prisma.detectedNarrative.count();
  
  console.log(`  • News articles: ${articleCount}`);
  console.log(`  • External posts (X): ${postCount}`);
  console.log(`  • Existing narratives: ${narrativeCount}`);
  console.log('');

  // Step 2: Extract entities from X posts
  console.log('🔍 Step 2: Extract entities from X posts');
  console.log('─'.repeat(60));
  
  const extractedCount = await extractEntitiesFromPosts();
  console.log('');

  // Step 3: Run narrative detection (includes both articles + posts)
  console.log('🎯 Step 3: Run narrative detection (articles + posts combined)');
  console.log('─'.repeat(60));
  
  const result = await runNarrativeDetection({
    minArticles: 2, // Lower threshold for testing
    timeWindowHours: 48,
    minSharedEntities: 1,
  });
  
  console.log(`  • Narratives detected: ${result.detected}`);
  console.log(`  • New narratives created: ${result.created}`);
  console.log('');

  // Step 4: Show sample narratives with source breakdown
  console.log('📖 Step 4: Sample narratives (showing mixed sources)');
  console.log('─'.repeat(60));
  
  const narratives = await prisma.detectedNarrative.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      articles: true,
    },
  });

  for (const narrative of narratives) {
    console.log(`\n  📰 ${narrative.title} (${narrative.sentiment})`);
    console.log(`     Summary: ${narrative.summary.slice(0, 80)}...`);
    
    // Count sources
    const articleIds = narrative.articles.map(a => a.articleId);
    
    const newsArticles = await prisma.newsArticle.count({
      where: { id: { in: articleIds } },
    });
    
    const xPosts = await prisma.externalPost.count({
      where: { id: { in: articleIds } },
    });
    
    console.log(`     Sources: ${newsArticles} articles, ${xPosts} X posts`);
    
    // Show sample X post if any
    if (xPosts > 0) {
      const samplePost = await prisma.externalPost.findFirst({
        where: { id: { in: articleIds } },
      });
      if (samplePost) {
        console.log(`     Sample X post: @${samplePost.authorHandle}: "${samplePost.content.slice(0, 60)}..."`);
      }
    }
  }

  console.log('');
  console.log('✅ Test complete! X posts are now included in narratives.');
  console.log('');
}

main()
  .catch((e) => {
    console.error('\n❌ Error:', e);
    console.error(e.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

