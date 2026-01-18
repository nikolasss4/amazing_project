import { prisma } from '../config/database';

export type StanceType = 'bullish' | 'bearish' | 'neutral';

export interface NarrativeStanceDTO {
  id: string;
  narrativeId: string;
  userId: string;
  stance: StanceType;
  createdAt: Date;
  updatedAt: Date;
}

export interface StanceCounts {
  bullish: number;
  bearish: number;
  neutral: number;
}

/**
 * Create or update a user's stance on a narrative
 * Each user can have only one stance per narrative
 */
export async function upsertNarrativeStance(
  narrativeId: string,
  userId: string,
  stance: StanceType
): Promise<NarrativeStanceDTO> {
  const result = await prisma.narrativeStance.upsert({
    where: {
      userId_narrativeId: {
        userId,
        narrativeId,
      },
    },
    create: {
      narrativeId,
      userId,
      stance,
    },
    update: {
      stance,
      updatedAt: new Date(),
    },
  });

  return {
    id: result.id,
    narrativeId: result.narrativeId,
    userId: result.userId,
    stance: result.stance as StanceType,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}

/**
 * Get a user's stance on a narrative
 */
export async function getNarrativeStance(
  narrativeId: string,
  userId: string
): Promise<NarrativeStanceDTO | null> {
  const stance = await prisma.narrativeStance.findUnique({
    where: {
      userId_narrativeId: {
        userId,
        narrativeId,
      },
    },
  });

  if (!stance) {
    return null;
  }

  return {
    id: stance.id,
    narrativeId: stance.narrativeId,
    userId: stance.userId,
    stance: stance.stance as StanceType,
    createdAt: stance.createdAt,
    updatedAt: stance.updatedAt,
  };
}

/**
 * Get stance counts for a narrative
 */
export async function getNarrativeStanceCounts(
  narrativeId: string
): Promise<StanceCounts> {
  const counts = await prisma.narrativeStance.groupBy({
    by: ['stance'],
    where: {
      narrativeId,
    },
    _count: {
      stance: true,
    },
  });

  const result: StanceCounts = {
    bullish: 0,
    bearish: 0,
    neutral: 0,
  };

  for (const count of counts) {
    if (count.stance === 'bullish') {
      result.bullish = count._count.stance;
    } else if (count.stance === 'bearish') {
      result.bearish = count._count.stance;
    } else if (count.stance === 'neutral') {
      result.neutral = count._count.stance;
    }
  }

  return result;
}

