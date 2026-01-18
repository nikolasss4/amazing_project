import { useCallback, useEffect, useRef, useState } from 'react';
import { CommunityService } from '../services/CommunityService';

export interface CommunityNarrative {
  id: string;
  title: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  velocity: number;
  sources: Array<'news'>;
  status: 'active' | 'stale';
  updated_at: string;
  is_followed: boolean;
  category: 'crypto';
  assets: string[];
  insights: {
    reason: string;
    headlines: Array<{ title: string; url: string }>;
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

export function useNarratives(
  userId?: string,
  limit: number = 20,
  pollIntervalMs: number = 30000
) {
  const [data, setData] = useState<CommunityNarrative[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    // Use default userId if not provided - Community page should always show data
    const effectiveUserId = userId || '11111111-1111-1111-1111-111111111111';
    try {
      setLoading(true);
      setError(null);
      const narratives = await CommunityService.getNarratives(effectiveUserId, limit);
      setData(narratives);
    } catch (err: any) {
      setError(err.message || 'Failed to load narratives');
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    fetchData();
    if (pollIntervalMs > 0) {
      timerRef.current = setInterval(fetchData, pollIntervalMs);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchData, pollIntervalMs]);

  return { data, loading, error, refetch: fetchData };
}

export function useFeed(
  userId?: string,
  limit: number = 20,
  pollIntervalMs: number = 30000
) {
  const [data, setData] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    // Use default userId if not provided - Community page should always show data
    const effectiveUserId = userId || '11111111-1111-1111-1111-111111111111';
    try {
      setLoading(true);
      setError(null);
      const feed = await CommunityService.getFeed(effectiveUserId, limit);
      setData(feed);
    } catch (err: any) {
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    fetchData();
    if (pollIntervalMs > 0) {
      timerRef.current = setInterval(fetchData, pollIntervalMs);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchData, pollIntervalMs]);

  return { data, loading, error, refetch: fetchData };
}

