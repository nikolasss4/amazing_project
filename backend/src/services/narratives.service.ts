import { prisma } from '../config/database';

export interface NarrativeResponse {
  id: string;
  title: string;
  description: string | null;
  trigger: {
    type: string;
    value: string | null;
  };
  sentiment: string;
  mentionCount: number;
  velocity: number;
  affectedAssets: string[];
  timeline: Array<{
    time: string;
    description: string;
  }>;
  createdAt: Date;
}

/**
 * Get narratives list
 */
export async function getNarratives(
  limit: number = 20,
  offset: number = 0,
  sentiment?: 'bullish' | 'bearish' | 'neutral'
): Promise<{ narratives: NarrativeResponse[]; total: number }> {
  const whereClause: any = {
    status: 'active',
    ...(sentiment && { sentiment }),
  };

  const total = await prisma.narrative.count({ where: whereClause });

  const narratives = await prisma.narrative.findMany({
    where: whereClause,
    include: {
      assets: {
        select: {
          assetSymbol: true,
        },
      },
      events: {
        select: {
          eventTime: true,
          description: true,
        },
        orderBy: { eventTime: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const formatted: NarrativeResponse[] = narratives.map((n) => ({
    id: n.id,
    title: n.title,
    description: n.description,
    trigger: {
      type: n.triggerType,
      value: n.triggerValue,
    },
    sentiment: n.sentiment,
    mentionCount: n.mentionCount,
    velocity: Number(n.velocity),
    affectedAssets: n.assets.map((a) => a.assetSymbol),
    timeline: n.events.map((e) => ({
      time: e.eventTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      description: e.description || '',
    })),
    createdAt: n.createdAt,
  }));

  return { narratives: formatted, total };
}

/**
 * Get single narrative by ID
 */
export async function getNarrativeById(id: string): Promise<NarrativeResponse | null> {
  const narrative = await prisma.narrative.findUnique({
    where: { id },
    include: {
      assets: {
        select: {
          assetSymbol: true,
        },
      },
      events: {
        select: {
          eventTime: true,
          description: true,
        },
        orderBy: { eventTime: 'asc' },
      },
    },
  });

  if (!narrative) {
    return null;
  }

  return {
    id: narrative.id,
    title: narrative.title,
    description: narrative.description,
    trigger: {
      type: narrative.triggerType,
      value: narrative.triggerValue,
    },
    sentiment: narrative.sentiment,
    mentionCount: narrative.mentionCount,
    velocity: Number(narrative.velocity),
    affectedAssets: narrative.assets.map((a) => a.assetSymbol),
    timeline: narrative.events.map((e) => ({
      time: e.eventTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      description: e.description || '',
    })),
    createdAt: narrative.createdAt,
  };
}

