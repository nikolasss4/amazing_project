import { prisma } from '../config/database';
import { classifySentiment, Sentiment } from './sentiment.service';
import * as newsSourceRepo from '../repositories/news-source.repository';
import * as entityRepo from '../repositories/article-entity.repository';

export interface CommunityNarrativeItem {
  id: string;
  title: string;
  sentiment: Sentiment;
  velocity: number;
  sources: Array<'news'>;
  status: 'active' | 'stale';
  updated_at: string;
  is_followed: boolean;
  category: 'crypto';
  assets: string[];
  insights: {
    reason: string;
    headlines: string[];
    sources: string[];
    bullets: string[];
    change: {
      current: number;
      previous: number;
      multiplier: number;
    };
    impact: string[];
    confidence: {
      level: 'low' | 'medium' | 'high';
      drivers: string[];
    };
    scenarios: {
      continues: string;
      fades: string;
    };
    next: string;
  };
}

export type SocialPost = NewsInsightPost | NarrativeEventPost | SystemStatusPost;

export interface NewsInsightPost {
  type: 'news_insight';
  id: string;
  source: string;
  title: string;
  content: string;
  sentiment: Sentiment;
  created_at: string;
}

export interface NarrativeEventPost {
  type: 'narrative_event';
  id: string;
  narrative_id: string;
  title: string;
  event: string;
  sentiment: Sentiment;
  created_at: string;
}

export interface SystemStatusPost {
  type: 'system_status';
  id: string;
  status: 'info' | 'warning';
  message: string;
  created_at: string;
}

function resolveStatus(updatedAt: Date): 'active' | 'stale' {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return updatedAt >= cutoff ? 'active' : 'stale';
}

export async function getCommunityNarratives(
  userId: string,
  limit: number = 50
): Promise<CommunityNarrativeItem[]> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.service.ts:71',message:'getCommunityNarratives entry',data:{userId,limit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  // #region agent log
  const cryptoSourcesCheck = await newsSourceRepo.getNewsSourcesByCategory('crypto');
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.service.ts:75',message:'crypto sources check',data:{cryptoSources:cryptoSourcesCheck.map(s=>({name:s.name,active:s.active}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  // Get active crypto source names
  const cryptoSources = await newsSourceRepo.getNewsSourcesByCategory('crypto');
  const cryptoSourceNames = cryptoSources.filter(s => s.active).map(s => s.name);
  
  // Also include macro sources (like NewsAPI) to show narratives from all sources
  // This allows narratives to show up even if they're from macro sources
  const macroSources = await newsSourceRepo.getNewsSourcesByCategory('macro');
  const macroSourceNames = macroSources.filter(s => s.active).map(s => s.name);
  const allSourceNames = [...new Set([...cryptoSourceNames, ...macroSourceNames])];
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.service.ts:82',message:'crypto sources',data:{cryptoSourceNames,cryptoSourcesCount:cryptoSources.length,activeCount:cryptoSourceNames.length,allSourceNames},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  if (allSourceNames.length === 0) {
    return [];
  }

  // Get all narratives with their articles (fetch all to ensure we don't miss crypto narratives)
  const allNarratives = await prisma.detectedNarrative.findMany({
    include: {
      metrics: {
        where: { period: '24h' },
        orderBy: { calculatedAt: 'desc' },
        take: 1,
      },
      articles: {
        select: { articleId: true },
      },
      followers: {
        where: { userId },
        select: { userId: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    // Don't limit here - we'll filter and limit after
  });

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.service.ts:108',message:'narratives fetched',data:{narrativesCount:allNarratives.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  const allArticleIds = allNarratives.flatMap((n) => n.articles.map((a) => a.articleId));
  const uniqueIds = [...new Set(allArticleIds)];

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.service.ts:114',message:'article IDs collected',data:{uniqueIdsCount:uniqueIds.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (uniqueIds.length === 0) {
    return [];
  }

  // Fetch articles and filter by crypto sources
  // First check if articles exist (any source)
  const allMatchingArticles = await prisma.newsArticle.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, source: true },
  });
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.service.ts:138',message:'all matching articles',data:{count:allMatchingArticles.length,sources:Array.from(new Set(allMatchingArticles.map(a=>a.source)))},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  const newsArticles = await prisma.newsArticle.findMany({
    where: { 
      id: { in: uniqueIds },
      source: { in: allSourceNames },
    },
    select: {
      id: true,
      source: true,
      title: true,
      content: true,
      publishedAt: true,
      url: true, // Include URL for headline links
    },
  });

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.service.ts:154',message:'crypto articles fetched',data:{articlesCount:newsArticles.length,uniqueSources:Array.from(new Set(newsArticles.map(a=>a.source))),foundIds:newsArticles.map(a=>a.id).slice(0,3)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  const cryptoArticleIds = new Set(newsArticles.map(a => a.id));
  
  // Filter narratives to only include those with crypto articles
  const narratives = allNarratives.filter(n => 
    n.articles.some(a => cryptoArticleIds.has(a.articleId))
  ).slice(0, limit);

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.service.ts:141',message:'narratives filtered',data:{filteredCount:narratives.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  // Get tickers for all crypto articles
  const allTickers = await prisma.articleEntity.findMany({
    where: {
      articleId: { in: Array.from(cryptoArticleIds) },
      type: 'ticker',
    },
    select: {
      articleId: true,
      entity: true,
    },
  });

  const tickersByArticleId = new Map<string, Set<string>>();
  for (const ticker of allTickers) {
    if (!tickersByArticleId.has(ticker.articleId)) {
      tickersByArticleId.set(ticker.articleId, new Set());
    }
    tickersByArticleId.get(ticker.articleId)!.add(ticker.entity);
  }

  const newsById = new Map(newsArticles.map((article) => [article.id, article]));

  const result = narratives.map((narrative) => {
    const articleIds = narrative.articles.map((a) => a.articleId);
    const linkedArticles = articleIds
      .map((id) => newsById.get(id))
      .filter(Boolean) as typeof newsArticles;

    const now = new Date();
    const currentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const currentArticles = linkedArticles.filter(
      (article) => article.publishedAt >= currentStart
    );
    const previousArticles = linkedArticles.filter(
      (article) => article.publishedAt >= previousStart && article.publishedAt < currentStart
    );

    const currentCount = currentArticles.length;
    const previousCount = previousArticles.length;
    const multiplier =
      previousCount === 0 ? (currentCount > 0 ? 2 : 0) : Math.round((currentCount / previousCount) * 10) / 10;

    // Use all linked articles for headlines/reason, not just last 24h
    // This ensures we show real article titles instead of generic fallback text
    const allArticles = linkedArticles
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()) // Most recent first
      .slice(0, 5)
      .filter((article) => article.title && article.url);

    const allArticleTitles = allArticles.map((article) => article.title);
    const articleHeadlines = allArticles.map((article) => ({
      title: article.title,
      url: article.url,
    }));

    const topTitles = currentArticles
      .slice(0, 3)
      .map((article) => article.title)
      .filter(Boolean);

    const reason =
      allArticleTitles.length > 0
        ? `${allArticleTitles.slice(0, 2).join(' · ')}.`
        : 'Narrative formed from recent multi-source coverage in the last 24 hours.';

    const sourcesCount = new Set(linkedArticles.map((article) => article.source)).size;
    const sourcesList = Array.from(
      linkedArticles.reduce((acc, article) => {
        acc.set(article.source, (acc.get(article.source) || 0) + 1);
        return acc;
      }, new Map<string, number>())
    )
      .sort((a, b) => b[1] - a[1])
      .map(([source]) => source)
      .slice(0, 5);

    const velocity = narrative.metrics[0]?.velocity ?? 0;
    const volatilitySignal =
      velocity >= 150 ? 'spiking' : velocity >= 50 ? 'accelerating' : velocity >= 10 ? 'rising' : 'stable';

    const impact = [
      `Coverage breadth: ${sourcesCount} sources`,
      `Recent activity: ${currentCount} articles (24h)`,
      `Volatility signal: ${volatilitySignal}`,
    ];

    const confidenceScore = Math.min(5, Math.round((sourcesCount + currentCount) / 4));
    const confidence =
      confidenceScore >= 4 ? 'high' : confidenceScore >= 2 ? 'medium' : 'low';

    const confidenceDrivers = [
      sourcesCount >= 3 ? 'multi-source confirmation' : 'limited source coverage',
      currentCount >= 5 ? 'sustained news flow' : 'early-stage coverage',
    ];

    const next =
      narrative.sentiment === 'bullish'
        ? 'Historically, bullish narratives with accelerating coverage tend to see follow-through over the next 1–3 sessions.'
        : narrative.sentiment === 'bearish'
        ? 'Bearish narratives often spark short-term drawdowns before stabilising; watch for confirmation or reversal.'
        : 'Neutral narratives typically consolidate until a new catalyst appears; watch for a directional break.';

    const bullets = [
      `${currentCount} new articles in 24h`,
      topTitles[0] ? topTitles[0] : 'Institutional attention building',
      confidenceDrivers[0],
    ];

    const scenarios = {
      continues:
        narrative.sentiment === 'bullish'
          ? 'Typically leads to steady accumulation if coverage sustains.'
          : narrative.sentiment === 'bearish'
          ? 'Often triggers short-term pressure unless new data counters it.'
          : 'Usually consolidates until a clearer catalyst appears.',
      fades:
        narrative.sentiment === 'bullish'
          ? 'Momentum tends to cool; price action reverts to baseline.'
          : narrative.sentiment === 'bearish'
          ? 'Risk premium compresses as uncertainty clears.'
          : 'Attention shifts quickly; impact decays within days.',
    };

    // Extract unique tickers (assets) from narrative articles
    const narrativeArticleIds = narrative.articles.map(a => a.articleId);
    const narrativeTickers = new Set<string>();
    for (const articleId of narrativeArticleIds) {
      const tickers = tickersByArticleId.get(articleId);
      if (tickers) {
        tickers.forEach(t => narrativeTickers.add(t));
      }
    }

    return {
      id: narrative.id,
      title: narrative.title,
      sentiment: narrative.sentiment as Sentiment,
      velocity,
      sources: ['news'],
      status: resolveStatus(narrative.updatedAt),
      updated_at: narrative.updatedAt.toISOString(),
      is_followed: narrative.followers.length > 0,
      category: 'crypto',
      assets: Array.from(narrativeTickers),
      insights: {
        reason,
        headlines: articleHeadlines, // Array of {title, url} objects
        sources: sourcesList,
        bullets,
        change: {
          current: currentCount,
          previous: previousCount,
          multiplier,
        },
        impact,
        confidence: {
          level: confidence,
          drivers: confidenceDrivers,
        },
        scenarios,
        next,
      },
    };
  });

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.service.ts:330',message:'getCommunityNarratives returning',data:{resultCount:result.length},timestamp:Date.now(),sessionId:'debug-session',runId:'verify-frontend-calls',hypothesisId:'F'})}).catch(()=>{});
  // #endregion

  return result;
}

export async function getCommunityFeed(limit: number = 50): Promise<SocialPost[]> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.service.ts:231',message:'getCommunityFeed entry',data:{limit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  // Get active crypto source names
  const cryptoSources = await newsSourceRepo.getNewsSourcesByCategory('crypto');
  const cryptoSourceNames = cryptoSources.filter(s => s.active).map(s => s.name);
  
  if (cryptoSourceNames.length === 0) {
    return [];
  }

  const [news, narratives] = await Promise.all([
    prisma.newsArticle.findMany({
      where: {
        source: { in: cryptoSourceNames },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    }),
    prisma.detectedNarrative.findMany({
      include: {
        articles: {
          select: { articleId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(limit, 10),
    }),
  ]);

  // Filter narratives to only include those with crypto articles
  const cryptoArticleIds = new Set(news.map(a => a.id));
  const cryptoNarratives = narratives.filter(n =>
    n.articles.some(a => cryptoArticleIds.has(a.articleId))
  );

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'community-api.service.ts:241',message:'feed data fetched',data:{newsCount:news.length,narrativesCount:cryptoNarratives.length,newsSources:Array.from(new Set(news.map(a=>a.source)))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  const newsItems: NewsInsightPost[] = news.map((article) => ({
    type: 'news_insight',
    id: article.id,
    source: article.source,
    title: article.title,
    content: article.content || article.title,
    sentiment: classifySentiment(`${article.title} ${article.content ?? ''}`),
    created_at: article.publishedAt.toISOString(),
  }));

  const narrativeEvents: NarrativeEventPost[] = cryptoNarratives.map((narrative) => ({
    type: 'narrative_event',
    id: `${narrative.id}-event`,
    narrative_id: narrative.id,
    title: narrative.title,
    event: `Narrative updated`,
    sentiment: narrative.sentiment as Sentiment,
    created_at: narrative.updatedAt.toISOString(),
  }));

  const systemStatus: SystemStatusPost = {
    type: 'system_status',
    id: 'system-status-news-only',
    status: 'info',
    message: 'Twitter ingestion is modular and currently disabled; narratives are driven by real news velocity.',
    created_at: new Date().toISOString(),
  };

  return [systemStatus, ...narrativeEvents, ...newsItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

