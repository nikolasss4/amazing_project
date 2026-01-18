/**
 * Quick test of RapidAPI X provider
 * Tests fetching tweets from a single account
 */

import { RapidApiXProvider } from './providers/RapidApiXProvider';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🧪 Testing RapidAPI X Provider...\n');

  const provider = new RapidApiXProvider();

  // Check availability
  const isAvailable = await provider.isAvailable();
  console.log(`✅ Provider available: ${isAvailable}`);

  if (!isAvailable) {
    console.error('❌ Provider not configured correctly');
    console.error('Check X_PROVIDER_BASE_URL and X_PROVIDER_KEY in .env');
    process.exit(1);
  }

  // Test with a single handle
  const testHandle = 'elonmusk';
  console.log(`\n📡 Fetching tweets from @${testHandle}...`);

  try {
    const posts = await provider.fetchRecentPostsByHandle(testHandle, 5);
    
    console.log(`\n✅ Fetched ${posts.length} posts\n`);

    if (posts.length > 0) {
      console.log('Sample post:');
      console.log('─'.repeat(60));
      const sample = posts[0];
      console.log(`Author: @${sample.authorHandle}`);
      console.log(`Content: ${sample.content.slice(0, 100)}${sample.content.length > 100 ? '...' : ''}`);
      console.log(`Published: ${sample.publishedAt}`);
      console.log(`Engagement: ${sample.engagement.likes} likes, ${sample.engagement.reposts} reposts`);
      console.log(`URL: ${sample.url || 'N/A'}`);
      console.log('─'.repeat(60));
    }

    console.log('\n✅ RapidAPI provider is working correctly!');
    console.log('\nNext steps:');
    console.log('  1. Run: npm run ingest:x');
    console.log('  2. Check: external_posts table');
    console.log('  3. Run: npm run test:x-narratives');
  } catch (error: any) {
    console.error('\n❌ Error fetching posts:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  • Check API key is valid');
    console.error('  • Check RapidAPI subscription is active');
    console.error('  • Check rate limits');
    process.exit(1);
  }
}

main();

