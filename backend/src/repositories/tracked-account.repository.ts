/**
 * Tracked Accounts Repository
 * 
 * Database operations for tracked social media accounts
 */

import { prisma } from '../config/database';

/**
 * Get all active tracked accounts
 * @param platform - Filter by platform (optional)
 */
export async function getActiveTrackedAccounts(platform?: string) {
  return prisma.trackedAccount.findMany({
    where: {
      isActive: true,
      ...(platform && { platform }),
    },
    orderBy: { accountHandle: 'asc' },
  });
}

/**
 * Get all tracked accounts
 * @param platform - Filter by platform (optional)
 * @param isActive - Filter by active status (optional)
 */
export async function getAllTrackedAccounts(platform?: string, isActive?: boolean) {
  return prisma.trackedAccount.findMany({
    where: {
      ...(platform && { platform }),
      ...(isActive !== undefined && { isActive }),
    },
    orderBy: { accountHandle: 'asc' },
  });
}

/**
 * Get tracked account by handle
 * @param platform - Platform name
 * @param handle - Account handle
 */
export async function getTrackedAccountByHandle(platform: string, handle: string) {
  return prisma.trackedAccount.findFirst({
    where: {
      platform,
      accountHandle: handle,
    },
  });
}

/**
 * Create tracked account
 */
export async function createTrackedAccount(data: {
  platform: string;
  accountHandle: string;
  accountName?: string;
  accountType?: string;
  isActive?: boolean;
}) {
  return prisma.trackedAccount.create({
    data,
  });
}

/**
 * Update tracked account
 */
export async function updateTrackedAccount(
  id: string,
  data: {
    accountName?: string;
    accountType?: string;
    isActive?: boolean;
    lastFetchedAt?: Date;
  }
) {
  return prisma.trackedAccount.update({
    where: { id },
    data,
  });
}

/**
 * Toggle tracked account active status
 */
export async function toggleTrackedAccountStatus(id: string) {
  const account = await prisma.trackedAccount.findUnique({
    where: { id },
  });

  if (!account) {
    throw new Error('Tracked account not found');
  }

  return prisma.trackedAccount.update({
    where: { id },
    data: { isActive: !account.isActive },
  });
}

/**
 * Update last fetched timestamp
 */
export async function updateLastFetchedAt(id: string, timestamp: Date) {
  return prisma.trackedAccount.update({
    where: { id },
    data: { lastFetchedAt: timestamp },
  });
}

/**
 * Get tracked accounts count by platform
 */
export async function getTrackedAccountsCountByPlatform() {
  const result = await prisma.trackedAccount.groupBy({
    by: ['platform'],
    _count: {
      id: true,
    },
  });

  return result.map((item) => ({
    platform: item.platform,
    count: item._count.id,
  }));
}

