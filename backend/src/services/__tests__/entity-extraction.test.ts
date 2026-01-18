/**
 * Unit Tests for Entity Extraction Service
 * 
 * Pure rule-based extraction - no ML or external APIs
 */

import {
  extractTickers,
  extractNamedEntities,
  extractKeywords,
  extractAllEntities,
  extractFromArticle,
} from '../services/entity-extraction.service';

describe('Entity Extraction Service', () => {
  describe('extractTickers', () => {
    it('should extract stock tickers with $ prefix', () => {
      const text = 'Today $NVDA and $AAPL both rose. $TSLA fell.';
      const tickers = extractTickers(text);
      
      expect(tickers).toEqual(['$AAPL', '$NVDA', '$TSLA']);
    });

    it('should handle multiple mentions of same ticker', () => {
      const text = '$NVDA is up. I bought $NVDA yesterday. $NVDA is great.';
      const tickers = extractTickers(text);
      
      expect(tickers).toEqual(['$NVDA']);
    });

    it('should only extract valid ticker format (1-5 uppercase letters)', () => {
      const text = '$NVDA $A $ABCDE $TOOLONG $lowercase';
      const tickers = extractTickers(text);
      
      expect(tickers).toEqual(['$A', '$ABCDE', '$NVDA']);
    });

    it('should return empty array when no tickers found', () => {
      const text = 'No tickers here, just regular text.';
      const tickers = extractTickers(text);
      
      expect(tickers).toEqual([]);
    });
  });

  describe('extractNamedEntities', () => {
    it('should extract person names (2 capitalized words)', () => {
      const text = 'Elon Musk announced today that Jerome Powell agreed.';
      const { people } = extractNamedEntities(text);
      
      expect(people).toContain('Elon Musk');
      expect(people).toContain('Jerome Powell');
    });

    it('should extract organization names (with indicators)', () => {
      const text = 'Apple Inc and Microsoft Corp are leaders. Federal Reserve announced.';
      const { orgs } = extractNamedEntities(text);
      
      expect(orgs).toContain('Apple Inc');
      expect(orgs).toContain('Microsoft Corp');
      expect(orgs).toContain('Federal Reserve');
    });

    it('should classify 3+ word entities as orgs', () => {
      const text = 'The Federal Reserve Bank made a decision.';
      const { orgs } = extractNamedEntities(text);
      
      expect(orgs).toContain('Federal Reserve Bank');
    });

    it('should return empty arrays when no entities found', () => {
      const text = 'no capitalized entities here at all.';
      const { people, orgs } = extractNamedEntities(text);
      
      expect(people).toEqual([]);
      expect(orgs).toEqual([]);
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords and filter stop words', () => {
      const text = 'The artificial intelligence revolution is transforming technology and creating innovation.';
      const keywords = extractKeywords(text, 5);
      
      expect(keywords).toContain('artificial');
      expect(keywords).toContain('intelligence');
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('is');
    });

    it('should filter out short words (< 4 chars)', () => {
      const text = 'AI is big now but artificial intelligence is better.';
      const keywords = extractKeywords(text, 5);
      
      expect(keywords).toContain('artificial');
      expect(keywords).toContain('intelligence');
      expect(keywords).not.toContain('big');
      expect(keywords).not.toContain('now');
    });

    it('should filter out generic financial terms', () => {
      const text = 'market trading stocks prices investment cryptocurrency ethereum blockchain technology.';
      const keywords = extractKeywords(text, 5);
      
      expect(keywords).toContain('cryptocurrency');
      expect(keywords).toContain('ethereum');
      expect(keywords).toContain('blockchain');
      expect(keywords).toContain('technology');
      expect(keywords).not.toContain('market');
      expect(keywords).not.toContain('trading');
    });

    it('should prioritize by frequency', () => {
      const text = 'bitcoin bitcoin bitcoin ethereum ethereum ripple';
      const keywords = extractKeywords(text, 3);
      
      expect(keywords[0]).toBe('bitcoin');
      expect(keywords[1]).toBe('ethereum');
      expect(keywords[2]).toBe('ripple');
    });

    it('should respect the limit parameter', () => {
      const text = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10';
      const keywords = extractKeywords(text, 3);
      
      expect(keywords.length).toBeLessThanOrEqual(3);
    });
  });

  describe('extractAllEntities', () => {
    it('should extract all entity types from text', () => {
      const text = `
        Elon Musk announced that Tesla Inc will accept $BTC.
        Meanwhile, $NVDA shares rose on artificial intelligence hype.
        Jerome Powell from Federal Reserve commented on inflation.
      `;
      
      const entities = extractAllEntities(text, 5);
      
      const tickers = entities.filter(e => e.type === 'ticker');
      const people = entities.filter(e => e.type === 'person');
      const orgs = entities.filter(e => e.type === 'org');
      const keywords = entities.filter(e => e.type === 'keyword');
      
      expect(tickers.length).toBeGreaterThan(0);
      expect(people.length).toBeGreaterThan(0);
      expect(orgs.length).toBeGreaterThan(0);
      expect(keywords.length).toBeGreaterThan(0);
    });
  });

  describe('extractFromArticle', () => {
    it('should extract entities from title and content', () => {
      const title = '$NVDA Surges on AI Boom';
      const content = `
        NVIDIA Corporation (NVDA) shares jumped today as artificial intelligence
        demand continues to grow. CEO Jensen Huang announced record earnings.
        The chipmaker is now worth over $2 trillion.
      `;
      
      const entities = extractFromArticle(title, content, 5);
      
      const tickerEntities = entities.filter(e => e.type === 'ticker');
      expect(tickerEntities.some(e => e.entity === '$NVDA')).toBe(true);
      
      const keywordEntities = entities.filter(e => e.type === 'keyword');
      expect(keywordEntities.some(e => e.entity === 'artificial')).toBe(true);
    });

    it('should give title more weight by repeating it', () => {
      const title = 'Bitcoin Bitcoin Bitcoin';
      const content = 'Ethereum Ethereum Litecoin';
      
      const entities = extractFromArticle(title, content, 10);
      const keywords = entities.filter(e => e.type === 'keyword').map(e => e.entity);
      
      // Bitcoin should appear first due to title weight
      expect(keywords[0]).toBe('bitcoin');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text', () => {
      const tickers = extractTickers('');
      const { people, orgs } = extractNamedEntities('');
      const keywords = extractKeywords('');
      
      expect(tickers).toEqual([]);
      expect(people).toEqual([]);
      expect(orgs).toEqual([]);
      expect(keywords).toEqual([]);
    });

    it('should handle text with only stop words', () => {
      const text = 'the a an and or but in on at to for of with';
      const keywords = extractKeywords(text);
      
      expect(keywords).toEqual([]);
    });

    it('should handle text with special characters', () => {
      const text = '$NVDA!!! @@@CEO### said... "artificial" & (intelligence)';
      const tickers = extractTickers(text);
      const keywords = extractKeywords(text, 5);
      
      expect(tickers).toContain('$NVDA');
      expect(keywords).toContain('artificial');
      expect(keywords).toContain('intelligence');
    });
  });
});

