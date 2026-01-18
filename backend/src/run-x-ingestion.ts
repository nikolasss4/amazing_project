/**
 * CLI script to run X ingestion job
 * 
 * Usage:
 *   npm run ingest:x
 *   npm run ingest:x -- --posts=30
 */

import { runXIngestionJob } from './jobs/x-ingestion.job';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const postsPerHandle = args.find(arg => arg.startsWith('--posts='))?.split('=')[1];
    
    const config = {
      postsPerHandle: postsPerHandle ? parseInt(postsPerHandle) : 20,
      delayBetweenHandles: 500,
    };

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║            Twitter/X Ingestion Job                       ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');

    const result = await runXIngestionJob(config);

    // Exit with appropriate code
    if (result.failedHandles > 0) {
      process.exit(1); // Partial failure
    } else {
      process.exit(0); // Success
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

