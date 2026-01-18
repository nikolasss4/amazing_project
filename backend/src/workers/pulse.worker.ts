/**
 * Community Pulse Worker
 * 
 * This worker calculates aggregated community signals.
 * 
 * In production, this would:
 * 1. Aggregate sentiment across narratives
 * 2. Calculate fastest-growing narratives (by velocity)
 * 3. Identify most discussed narrative
 * 4. Store in community_pulse table
 */

import { Queue } from 'bull';
import { redis } from '../config/redis';
import { prisma } from '../config/database';

// Create job queue
const pulseQueue = new Queue('pulse', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

/**
 * Calculate overall sentiment from posts
 */
async function calculateOverallSentiment(period: 'hour' | 'day' | 'week') {
  const since = new Date();
  switch (period) {
    case 'hour':
      since.setHours(since.getHours() - 1);
      break;
    case 'day':
      since.setDate(since.getDate() - 1);
      break;
    case 'week':
      since.setDate(since.getDate() - 7);
      break;
  }

  const posts = await prisma.socialPost.findMany({
    where: {
      createdAt: { gte: since },
    },
    select: {
      sentiment: true,
    },
  });

  const total = posts.length;
  if (total === 0) {
    return { bullish: 0, bearish: 0, neutral: 0 };
  }

  const bullish = posts.filter((p) => p.sentiment === 'bullish').length;
  const bearish = posts.filter((p) => p.sentiment === 'bearish').length;
  const neutral = posts.filter((p) => p.sentiment === 'neutral').length;

  return {
    bullish: (bullish / total) * 100,
    bearish: (bearish / total) * 100,
    neutral: (neutral / total) * 100,
  };
}

/**
 * Process pulse calculation job
 */
pulseQueue.process('calculate-pulse', async (job) => {
  console.log(`Processing pulse calculation job ${job.id}`);

  const periods: Array<'hour' | 'day' | 'week'> = ['hour', 'day', 'week'];

  for (const period of periods) {
    const sentiment = await calculateOverallSentiment(period);

    // Store overall pulse (narrativeId = null)
    await prisma.communityPulse.create({
      data: {
        narrativeId: null,
        bullishPercent: sentiment.bullish,
        bearishPercent: sentiment.bearish,
        neutralPercent: sentiment.neutral,
        discussionCount: 0, // Overall pulse doesn't have discussion count
        period,
      },
    });
  }

  console.log('Pulse calculation completed');
});

/**
 * Schedule periodic calculation
 * Run every 15 minutes
 */
export function startPulseWorker() {
  console.log('Starting pulse worker...');

  // Add initial job
  pulseQueue.add(
    'calculate-pulse',
    {},
    {
      repeat: {
        every: 15 * 60 * 1000, // 15 minutes
      },
    }
  );

  console.log('Pulse worker scheduled (every 15 minutes)');
}

// Run if called directly
if (require.main === module) {
  startPulseWorker();
}

