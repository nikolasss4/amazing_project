import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import * as friendsService from '../services/friends.service';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

const qrResolveSchema = z.object({
  qrData: z.string().min(1),
});

const addFriendSchema = z.object({
  friendUserId: z.string().uuid(),
});

/**
 * POST /api/v1/friends/qr/resolve
 * Resolve QR code and add friend (auto-add in MVP)
 */
router.post('/qr/resolve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { qrData } = qrResolveSchema.parse(req.body);
    const userId = req.userId!;

    const result = await friendsService.resolveQRCodeAndAddFriend(userId, qrData);

    res.json({
      success: true,
      friendId: result.friendId,
      username: result.username,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    res.status(400).json({ error: error.message || 'Failed to resolve QR code' });
  }
});

/**
 * POST /api/v1/friends/add
 * Manually add friend by userId
 * Body: { friendUserId: string }
 */
router.post('/add', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { friendUserId } = addFriendSchema.parse(req.body);
    const userId = req.userId!;

    await friendsService.addFriend(userId, friendUserId);

    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    res.status(400).json({ error: error.message || 'Failed to add friend' });
  }
});

/**
 * GET /api/v1/friends
 * Get user's friend list
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const friends = await friendsService.getFriends(userId);

    res.json({ friends });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get friends' });
  }
});

export default router;

