/**
 * Entity Extraction Service
 * 
 * Extracts keywords, tickers, and named entities from text using simple rules:
 * - Regex patterns for tickers ($NVDA, $AAPL)
 * - Capitalization patterns for named entities
 * - Stop-word filtering for keywords
 * 
 * No ML or external AI - pure rule-based extraction
 */

export type EntityType = 'keyword' | 'ticker' | 'person' | 'org';

export interface ExtractedEntity {
  entity: string;
  type: EntityType;
}

/**
 * Common English stop words to filter out
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might',
  'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now', 'said',
]);

/**
 * Common financial/business terms (not stop words but too generic)
 */
const GENERIC_TERMS = new Set([
  'market', 'markets', 'trading', 'traders', 'investors', 'investment',
  'stock', 'stocks', 'shares', 'price', 'prices', 'company', 'companies',
  'business', 'financial', 'economic', 'economy', 'sector', 'industry',
  'announced', 'announcement', 'reported', 'reports', 'showed', 'showed',
]);

/**
 * Known organization indicators
 */
const ORG_INDICATORS = [
  'Corp', 'Inc', 'LLC', 'Ltd', 'Group', 'Holdings', 'Partners',
  'Bank', 'Capital', 'Fund', 'Management', 'Technologies', 'Systems',
];

/**
 * Extract stock tickers from text (e.g., $NVDA, $AAPL)
 */
export function extractTickers(text: string): string[] {
  const tickerRegex = /\$[A-Z]{1,5}\b/g;
  const matches = text.match(tickerRegex) || [];
  
  // Remove duplicates and sort
  return Array.from(new Set(matches)).sort();
}

/**
 * Extract potential named entities (people and organizations) using capitalization patterns
 */
export function extractNamedEntities(text: string): { people: string[]; orgs: string[] } {
  const people = new Set<string>();
  const orgs = new Set<string>();

  // Match sequences of capitalized words (2-4 words)
  // Pattern: "John Smith", "Federal Reserve", "Apple Inc"
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g;
  const matches = text.match(capitalizedPattern) || [];

  for (const match of matches) {
    const trimmed = match.trim();
    
    // Skip if too short or looks like sentence start
    if (trimmed.length < 3) continue;
    
    // Check if it's likely an organization
    const hasOrgIndicator = ORG_INDICATORS.some(indicator => 
      trimmed.includes(indicator)
    );
    
    // Words in the entity
    const words = trimmed.split(/\s+/);
    
    if (hasOrgIndicator || words.length > 2) {
      // Likely an organization (has indicator or 3+ words)
      orgs.add(trimmed);
    } else if (words.length === 2) {
      // Two capitalized words = likely a person name
      people.add(trimmed);
    }
  }

  return {
    people: Array.from(people).sort(),
    orgs: Array.from(orgs).sort(),
  };
}

/**
 * Extract keywords from text using word frequency and stop-word filtering
 */
export function extractKeywords(text: string, limit: number = 10): string[] {
  // Convert to lowercase and split into words
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => {
      // Filter out:
      // - Stop words
      // - Generic terms
      // - Short words (< 4 chars)
      // - Numbers
      return word.length >= 4 
        && !STOP_WORDS.has(word)
        && !GENERIC_TERMS.has(word)
        && !/^\d+$/.test(word);
    });

  // Count word frequency
  const frequency = new Map<string, number>();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }

  // Sort by frequency and take top N
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Extract all entities from text
 */
export function extractAllEntities(
  text: string,
  maxKeywords: number = 10
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  // Extract tickers
  const tickers = extractTickers(text);
  for (const ticker of tickers) {
    entities.push({ entity: ticker, type: 'ticker' });
  }

  // Extract named entities
  const { people, orgs } = extractNamedEntities(text);
  for (const person of people) {
    entities.push({ entity: person, type: 'person' });
  }
  for (const org of orgs) {
    entities.push({ entity: org, type: 'org' });
  }

  // Extract keywords
  const keywords = extractKeywords(text, maxKeywords);
  for (const keyword of keywords) {
    entities.push({ entity: keyword, type: 'keyword' });
  }

  return entities;
}

/**
 * Extract entities from article title + content combined
 */
export function extractFromArticle(
  title: string,
  content: string,
  maxKeywords: number = 10
): ExtractedEntity[] {
  // Combine title and content, giving title more weight by repeating it
  const combinedText = `${title} ${title} ${content}`;
  return extractAllEntities(combinedText, maxKeywords);
}

