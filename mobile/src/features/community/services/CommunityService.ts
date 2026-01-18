import axios from 'axios';
import type { CommunityNarrative } from '../hooks/useCommunityData';

// API Configuration
// Use 127.0.0.1 instead of localhost for better web compatibility
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3000/api/v1';
const COMMUNITY_API_BASE_URL = process.env.COMMUNITY_API_BASE_URL || 'http://127.0.0.1:3000/api';

// For development: use your machine's local IP for testing on device
// const API_BASE_URL = 'http://192.168.1.x:3000/api/v1';

interface FriendInfo {
  id: string;
  username: string;
  addedAt: string;
}

interface AddFriendResponse {
  success: boolean;
  friendId?: string;
  username?: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  returnPercent: number;
  winRate: number;
  tradesCount: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
  total: number;
}

export type SocialPost =
  | NewsInsightPost
  | NarrativeEventPost
  | SystemStatusPost;

export interface NewsInsightPost {
  type: 'news_insight';
  id: string;
  source: string;
  title: string;
  content: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  created_at: string;
}

export interface NarrativeEventPost {
  type: 'narrative_event';
  id: string;
  narrative_id: string;
  title: string;
  event: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  created_at: string;
}

export interface SystemStatusPost {
  type: 'system_status';
  id: string;
  status: 'info' | 'warning';
  message: string;
  created_at: string;
}

export interface MarketMessage {
  id: string;
  narrativeId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

export type StanceType = 'bullish' | 'bearish' | 'neutral';

export interface NarrativeStance {
  id: string;
  narrativeId: string;
  userId: string;
  stance: StanceType;
  createdAt: string;
  updatedAt: string;
}

export interface StanceData {
  userStance: StanceType | null;
  counts: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
}

/**
 * Community Service
 * Handles all API calls for community features
 */
class CommunityServiceClass {
  private getHeaders(userId: string) {
    return {
      'Content-Type': 'application/json',
      'x-user-id': userId, // MVP authentication
    };
  }

  /**
   * Add friend via QR code scan
   */
  async addFriendViaQR(userId: string, qrData: string): Promise<AddFriendResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/friends/qr/resolve`,
        { qrData },
        { headers: this.getHeaders(userId) }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to add friend');
    }
  }

  /**
   * Add friend manually by userId
   */
  async addFriend(userId: string, friendUserId: string): Promise<AddFriendResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/friends/add`,
        { friendUserId },
        { headers: this.getHeaders(userId) }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to add friend');
    }
  }

  /**
   * Get user's friend list
   */
  async getFriends(userId: string): Promise<FriendInfo[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/friends`, {
        headers: this.getHeaders(userId),
      });
      return response.data.friends;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get friends');
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    userId: string,
    scope: 'global' | 'friends' = 'global',
    period: 'today' | 'week' | 'month' | 'all-time' = 'today',
    limit: number = 100
  ): Promise<LeaderboardResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/leaderboard`, {
        headers: this.getHeaders(userId),
        params: { scope, period, limit },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get leaderboard');
    }
  }

  /**
   * Get community narratives (real backend data)
   */
  async getNarratives(userId: string, limit: number = 20): Promise<CommunityNarrative[]> {
    try {
      const response = await axios.get(`${COMMUNITY_API_BASE_URL}/narratives`, {
        headers: this.getHeaders(userId),
        params: { limit },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get narratives');
    }
  }

  /**
   * Follow a narrative
   */
  async followNarrative(userId: string, narrativeId: string): Promise<void> {
    try {
      await axios.post(
        `${COMMUNITY_API_BASE_URL}/narratives/${narrativeId}/follow`,
        {},
        { headers: this.getHeaders(userId) }
      );
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to follow narrative');
    }
  }

  /**
   * Fade a narrative (unfollow)
   */
  async fadeNarrative(userId: string, narrativeId: string): Promise<void> {
    try {
      await axios.post(
        `${COMMUNITY_API_BASE_URL}/narratives/${narrativeId}/fade`,
        {},
        { headers: this.getHeaders(userId) }
      );
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fade narrative');
    }
  }

  /**
   * Get market room messages for a narrative
   */
  async getRoomMessages(
    userId: string,
    narrativeId: string,
    limit: number = 50
  ): Promise<MarketMessage[]> {
    try {
      const response = await axios.get(`${COMMUNITY_API_BASE_URL}/rooms/${narrativeId}/messages`, {
        headers: this.getHeaders(userId),
        params: { limit },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get room messages');
    }
  }

  /**
   * Post a market room message
   */
  async postRoomMessage(userId: string, narrativeId: string, text: string): Promise<MarketMessage> {
    try {
      const response = await axios.post(
        `${COMMUNITY_API_BASE_URL}/rooms/${narrativeId}/messages`,
        { text },
        { headers: this.getHeaders(userId) }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to post message');
    }
  }

  /**
   * Delete a market room message
   */
  async deleteRoomMessage(userId: string, narrativeId: string, messageId: string): Promise<void> {
    try {
      await axios.delete(
        `${COMMUNITY_API_BASE_URL}/rooms/${narrativeId}/messages/${messageId}`,
        { headers: this.getHeaders(userId) }
      );
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete message');
    }
  }

  /**
   * Get unified social feed (news + X)
   */
  async getFeed(userId: string, limit: number = 20): Promise<SocialPost[]> {
    try {
      const response = await axios.get(`${COMMUNITY_API_BASE_URL}/feed`, {
        headers: this.getHeaders(userId),
        params: { limit },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get feed');
    }
  }

  /**
   * Cast or update a stance vote on a narrative
   */
  async castStance(
    userId: string,
    narrativeId: string,
    stance: StanceType
  ): Promise<NarrativeStance> {
    try {
      const response = await axios.post(
        `${COMMUNITY_API_BASE_URL}/rooms/${narrativeId}/stance`,
        { stance },
        { headers: this.getHeaders(userId) }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to cast stance');
    }
  }

  /**
   * Get stance data for a narrative (user's stance + counts)
   */
  async getStance(userId: string, narrativeId: string): Promise<StanceData> {
    try {
      const response = await axios.get(
        `${COMMUNITY_API_BASE_URL}/rooms/${narrativeId}/stance`,
        { headers: this.getHeaders(userId) }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get stance');
    }
  }
}

export const CommunityService = new CommunityServiceClass();

