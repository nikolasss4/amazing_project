import { prisma } from '../config/database';
import { runNarrativeDetection } from '../services/narrative-detection.service';
import { updateAllNarrativeMetrics } from '../services/narrative-metrics.service';

interface BuildNarrativesResult {
  detected: number;
  created: number;
  metricsCalculated: number;
  metricsStored: number;
  narrativesUpdated: number;
}

async function getLatestContentTimestamp(articleIds: string[]): Promise<Date | null> {
  if (articleIds.length === 0) return null;

  const [newsLatest, xLatest] = await Promise.all([
    prisma.newsArticle.findFirst({
      where: { id: { in: articleIds } },
      orderBy: { publishedAt: 'desc' },
      select: { publishedAt: true },
    }),
    prisma.externalPost.findFirst({
      where: { id: { in: articleIds }, platform: 'x' },
      orderBy: { publishedAt: 'desc' },
      select: { publishedAt: true },
    }),
  ]);

  const candidates = [newsLatest?.publishedAt, xLatest?.publishedAt].filter(Boolean) as Date[];
  if (candidates.length === 0) return null;

  return new Date(Math.max(...candidates.map((d) => d.getTime())));
}

export async function buildNarratives(): Promise<BuildNarrativesResult> {
  const detection = await runNarrativeDetection({
    timeWindowHours: process.env.NARRATIVE_TIME_WINDOW_HOURS
      ? Number(process.env.NARRATIVE_TIME_WINDOW_HOURS)
      : undefined,
    minArticles: process.env.NARRATIVE_MIN_ARTICLES
      ? Number(process.env.NARRATIVE_MIN_ARTICLES)
      : undefined,
    minSharedEntities: process.env.NARRATIVE_MIN_SHARED_ENTITIES
      ? Number(process.env.NARRATIVE_MIN_SHARED_ENTITIES)
      : undefined,
  });
  const metricsResult = await updateAllNarrativeMetrics(['1h', '24h']);

  const narratives = await prisma.detectedNarrative.findMany({
    include: {
      articles: {
        select: { articleId: true },
      },
    },
  });

  let updated = 0;

  for (const narrative of narratives) {
    const articleIds = narrative.articles.map((a) => a.articleId);
    const latestTimestamp = await getLatestContentTimestamp(articleIds);
    if (!latestTimestamp) {
      continue;
    }

    await prisma.detectedNarrative.update({
      where: { id: narrative.id },
      data: {
        updatedAt: latestTimestamp,
      },
    });
    updated++;
  }

  return {
    detected: detection.detected,
    created: detection.created,
    metricsCalculated: metricsResult.calculated,
    metricsStored: metricsResult.stored,
    narrativesUpdated: updated,
  };
}

export async function runBuildNarrativesJob(): Promise<void> {
  const start = Date.now();
  console.log('🧠 Building narratives...');

  const result = await buildNarratives();

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log('✅ Narrative build complete');
  console.log(`  • Detected: ${result.detected}`);
  console.log(`  • Created: ${result.created}`);
  console.log(`  • Metrics calculated: ${result.metricsCalculated}`);
  console.log(`  • Metrics stored: ${result.metricsStored}`);
  console.log(`  • Narratives updated: ${result.narrativesUpdated}`);
  console.log(`  • Duration: ${duration}s`);
}

