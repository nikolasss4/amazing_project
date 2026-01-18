import { FriendsRepository } from '../repositories/friends.repository';
import { decodeQRCode } from '../utils/qr-code';

export interface FriendInfo {
  id: string;
  username: string;
  addedAt: Date;
}

/**
 * Resolve QR code and add friend (auto-add in MVP)
 * 
 * Validation:
 * - QR code format must be valid
 * - User must exist
 * - Cannot add yourself (self-add prevention)
 * - Prevents duplicate friendships
 */
export async function resolveQRCodeAndAddFriend(
  userId: string,
  qrData: string
): Promise<{ friendId: string; username: string }> {
  // Decode QR code
  const decoded = decodeQRCode(qrData);
  if (!decoded || decoded.type !== 'friend') {
    throw new Error('Invalid QR code format');
  }

  const friendId = decoded.userId;

  // Validation: Prevent self-add
  if (friendId === userId) {
    throw new Error('Cannot add yourself as friend');
  }

  // Find user by ID
  const friend = await FriendsRepository.findUserById(friendId);
  if (!friend) {
    throw new Error('User not found');
  }

  // Validation: Check if friendship already exists (prevent duplicates)
  const exists = await FriendsRepository.friendshipExists(userId, friendId);
  if (exists) {
    return { friendId, username: friend.username };
  }

  // Create bidirectional friendship (auto-add, no request)
  await FriendsRepository.createBidirectionalFriendship(userId, friendId);

  return { friendId, username: friend.username };
}

/**
 * Add friend by userId
 * 
 * Validation:
 * - Cannot add yourself (self-add prevention)
 * - User must exist
 * - Prevents duplicate friendships
 */
export async function addFriend(userId: string, friendId: string): Promise<void> {
  // Validation: Prevent self-add
  if (userId === friendId) {
    throw new Error('Cannot add yourself as friend');
  }

  // Verify friend exists
  const friend = await FriendsRepository.findUserById(friendId);
  if (!friend) {
    throw new Error('User not found');
  }

  // Validation: Check if friendship already exists (prevent duplicates)
  const exists = await FriendsRepository.friendshipExists(userId, friendId);
  if (exists) {
    return; // Already friends, no error
  }

  // Create bidirectional friendship
  await FriendsRepository.createBidirectionalFriendship(userId, friendId);
}

/**
 * Get user's friend list
 */
export async function getFriends(userId: string): Promise<FriendInfo[]> {
  return FriendsRepository.getFriendsByUserId(userId);
}

/**
 * Check if two users are friends
 */
export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  return FriendsRepository.areFriends(userId1, userId2);
}
