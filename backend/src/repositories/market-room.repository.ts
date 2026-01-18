import { prisma } from '../config/database';

export interface MarketMessageDTO {
  id: string;
  narrativeId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: Date;
}

export async function getMessagesByNarrativeId(
  narrativeId: string,
  limit: number = 50
): Promise<MarketMessageDTO[]> {
  const messages = await prisma.marketMessage.findMany({
    where: { narrativeId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { username: true } } },
  });

  return messages.map((message) => ({
    id: message.id,
    narrativeId: message.narrativeId,
    userId: message.userId,
    username: message.user.username,
    text: message.text,
    createdAt: message.createdAt,
  }));
}

export async function createMarketMessage(
  narrativeId: string,
  userId: string,
  text: string
): Promise<MarketMessageDTO> {
  const message = await prisma.marketMessage.create({
    data: {
      narrativeId,
      userId,
      text,
    },
    include: { user: { select: { username: true } } },
  });

  return {
    id: message.id,
    narrativeId: message.narrativeId,
    userId: message.userId,
    username: message.user.username,
    text: message.text,
    createdAt: message.createdAt,
  };
}


