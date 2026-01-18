/**
 * Friends Repository
 * 
 * Repository layer for friend operations.
 * Provides data access functions for the friends feature.
 * 
 * This abstracts database operations from business logic.
 */

import { prisma } from '../config/database';
import { FriendInfo } from '../services/friends.service';

/**
 * Repository functions for Friends
 */
export class FriendsRepository {
  /**
   * Find user by ID
   */
  static async findUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Check if friendship exists
   */
  static async friendshipExists(userId: string, friendId: string): Promise<boolean> {
    const friendship = await prisma.friendship.findUnique({
      where: {
        userId_friendId: {
          userId,
          friendId,
        },
      },
    });
    return !!friendship;
  }

  /**
   * Create bidirectional friendship
   * Creates two records: (userId -> friendId) and (friendId -> userId)
   */
  static async createBidirectionalFriendship(userId: string, friendId: string): Promise<void> {
    // Create both directions in a transaction
    await prisma.$transaction([
      prisma.friendship.create({
        data: { userId, friendId },
      }),
      prisma.friendship.create({
        data: { userId: friendId, friendId: userId },
      }),
    ]);
  }

  /**
   * Get user's friend list
   */
  static async getFriendsByUserId(userId: string): Promise<FriendInfo[]> {
    const friendships = await prisma.friendship.findMany({
      where: { userId },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return friendships.map((f) => ({
      id: f.friend.id,
      username: f.friend.username,
      addedAt: f.createdAt,
    }));
  }

  /**
   * Check if two users are friends
   */
  static async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await prisma.friendship.findUnique({
      where: {
        userId_friendId: {
          userId: userId1,
          friendId: userId2,
        },
      },
    });
    return !!friendship;
  }
}

