import * as dotenv from 'dotenv';
import { runBuildNarrativesJob } from './jobs/build-narratives';

dotenv.config();

async function main() {
  try {
    await runBuildNarrativesJob();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Narrative build failed:', error.message);
    process.exit(1);
  }
}

main();

