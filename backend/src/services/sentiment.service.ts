/**
 * Sentiment Classification Service
 * 
 * Simple keyword-based sentiment analysis for narratives.
 * No ML or external APIs - pure rule-based classification.
 * 
 * Rules:
 * - Contains bullish keywords → 'bullish'
 * - Contains bearish keywords → 'bearish'
 * - Otherwise → 'neutral'
 */

export type Sentiment = 'bullish' | 'bearish' | 'neutral';

/**
 * Bullish keywords - indicate positive/upward movement
 */
const BULLISH_KEYWORDS = new Set([
  // Price action
  'surge', 'surges', 'surged', 'surging',
  'rally', 'rallies', 'rallied', 'rallying',
  'gain', 'gains', 'gained', 'gaining',
  'rise', 'rises', 'rose', 'rising',
  'climb', 'climbs', 'climbed', 'climbing',
  'jump', 'jumps', 'jumped', 'jumping',
  'soar', 'soars', 'soared', 'soaring',
  'spike', 'spikes', 'spiked', 'spiking',
  'boom', 'booming',
  'breakout', 'breakthrough',
  
  // Positive sentiment
  'bullish', 'optimistic', 'positive',
  'strong', 'strength', 'robust',
  'growth', 'growing', 'expansion',
  'record', 'high', 'highs', 'peak',
  'outperform', 'outperformed', 'outperforming',
  'upgrade', 'upgraded', 'upgrades',
  'beat', 'beats', 'exceeded', 'exceeds',
  
  // Market terms
  'demand', 'buying', 'accumulation',
  'confidence', 'momentum',
  'innovation', 'breakthrough',
  'profit', 'profits', 'profitable',
  'revenue', 'earnings', 'success',
]);

/**
 * Bearish keywords - indicate negative/downward movement
 */
const BEARISH_KEYWORDS = new Set([
  // Price action
  'fall', 'falls', 'fell', 'falling',
  'drop', 'drops', 'dropped', 'dropping',
  'decline', 'declines', 'declined', 'declining',
  'plunge', 'plunges', 'plunged', 'plunging',
  'crash', 'crashes', 'crashed', 'crashing',
  'tumble', 'tumbles', 'tumbled', 'tumbling',
  'sink', 'sinks', 'sank', 'sinking',
  'slump', 'slumps', 'slumped', 'slumping',
  
  // Negative sentiment
  'bearish', 'pessimistic', 'negative',
  'weak', 'weakness', 'struggling',
  'loss', 'losses', 'losing', 'lost',
  'underperform', 'underperformed', 'underperforming',
  'downgrade', 'downgraded', 'downgrades',
  'miss', 'missed', 'misses', 'below',
  
  // Risk/concern terms
  'concern', 'concerns', 'worried', 'worry',
  'risk', 'risks', 'risky',
  'fear', 'fears', 'panic',
  'crisis', 'problem', 'problems',
  'threat', 'threatens', 'threatened',
  'investigation', 'lawsuit', 'probe',
  'volatility', 'volatile', 'unstable',
  'recession', 'slowdown', 'contraction',
]);

/**
 * Classify sentiment based on text content
 */
export function classifySentiment(text: string): Sentiment {
  const lowerText = text.toLowerCase();
  
  // Count bullish and bearish keyword matches
  let bullishCount = 0;
  let bearishCount = 0;
  
  for (const keyword of BULLISH_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      bullishCount++;
    }
  }
  
  for (const keyword of BEARISH_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      bearishCount++;
    }
  }
  
  // Determine sentiment based on counts
  if (bullishCount === 0 && bearishCount === 0) {
    return 'neutral';
  }
  
  if (bullishCount > bearishCount) {
    return 'bullish';
  }
  
  if (bearishCount > bullishCount) {
    return 'bearish';
  }
  
  // Equal counts → neutral
  return 'neutral';
}

/**
 * Classify narrative sentiment based on title and summary
 */
export function classifyNarrativeSentiment(
  title: string,
  summary: string
): Sentiment {
  // Combine title and summary, giving title more weight
  const combinedText = `${title} ${title} ${summary}`;
  return classifySentiment(combinedText);
}

/**
 * Get sentiment statistics from a collection of sentiments
 */
export function getSentimentStats(sentiments: Sentiment[]): {
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
  bullishPercent: number;
  bearishPercent: number;
  neutralPercent: number;
} {
  const bullish = sentiments.filter(s => s === 'bullish').length;
  const bearish = sentiments.filter(s => s === 'bearish').length;
  const neutral = sentiments.filter(s => s === 'neutral').length;
  const total = sentiments.length;
  
  return {
    bullish,
    bearish,
    neutral,
    total,
    bullishPercent: total > 0 ? Math.round((bullish / total) * 100) : 0,
    bearishPercent: total > 0 ? Math.round((bearish / total) * 100) : 0,
    neutralPercent: total > 0 ? Math.round((neutral / total) * 100) : 0,
  };
}

/**
 * Explain why a sentiment was assigned (for debugging)
 */
export function explainSentiment(text: string): {
  sentiment: Sentiment;
  bullishMatches: string[];
  bearishMatches: string[];
} {
  const lowerText = text.toLowerCase();
  const bullishMatches: string[] = [];
  const bearishMatches: string[] = [];
  
  for (const keyword of BULLISH_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      bullishMatches.push(keyword);
    }
  }
  
  for (const keyword of BEARISH_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      bearishMatches.push(keyword);
    }
  }
  
  const sentiment = classifySentiment(text);
  
  return {
    sentiment,
    bullishMatches,
    bearishMatches,
  };
}

