# News Ingestion Service Documentation

## Overview

The News Ingestion Service fetches news articles from external sources and stores them **raw** in the database. No analysis, no sentiment processing - just pure ingestion.

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  NewsSourceProvider Interface                   │
│  (Abstract - defines contract)                  │
│                                                 │
└────────────────┬────────────────────────────────┘
                 │
                 │ implements
                 │
    ┌────────────┴─────────────┬──────────────────────┐
    │                          │                      │
    ▼                          ▼                      ▼
┌─────────────┐    ┌─────────────────┐    ┌────────────────┐
│   Mock      │    │   Reuters API   │    │  Bloomberg API │
│  Provider   │    │   (future)      │    │   (future)     │
└─────────────┘    └─────────────────┘    └────────────────┘
         │                  │                      │
         └──────────────────┴──────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  NewsIngestionService │
                │  (orchestrates all)   │
                └───────────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │   Database     │
                   │  (raw storage) │
                   └────────────────┘
```

---

## Database Schema

### NewsArticle Table

```sql
CREATE TABLE NewsArticle (
  id          TEXT PRIMARY KEY,        -- UUID
  source      TEXT NOT NULL,           -- e.g., 'mock', 'reuters', 'bloomberg'
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,           -- Full article content
  url         TEXT UNIQUE NOT NULL,    -- Unique article URL
  publishedAt DATETIME NOT NULL,       -- When article was published
  createdAt   DATETIME DEFAULT NOW     -- When we ingested it
);

CREATE INDEX idx_news_source ON NewsArticle(source);
CREATE INDEX idx_news_published ON NewsArticle(publishedAt);
CREATE INDEX idx_news_created ON NewsArticle(createdAt);
```

**Constraints:**
- `url` is unique (prevents duplicate ingestion)
- No foreign keys (standalone table)
- No sentiment or analysis fields (raw data only)

---

## Interface: NewsSourceProvider

All news providers must implement this interface:

```typescript
interface NewsSourceProvider {
  // Unique identifier (e.g., 'reuters', 'bloomberg', 'mock')
  getSourceName(): string;

  // Fetch articles from the source
  fetchArticles(limit?: number): Promise<NewsArticle[]>;

  // Check if provider is configured/available
  isAvailable(): Promise<boolean>;
}

interface NewsArticle {
  source: string;
  title: string;
  content: string;
  url: string;
  publishedAt: Date;
}
```

**Design Benefits:**
- ✅ **Pluggable**: Easy to add new providers
- ✅ **Testable**: Mock providers for development
- ✅ **Flexible**: Each provider can implement differently
- ✅ **No coupling**: Service doesn't know implementation details

---

## MockNewsProvider

Returns fake news articles for testing.

**Features:**
- 15 realistic financial news titles
- Randomized publication times (last 24 hours)
- Unique URLs
- No external API calls
- Always available

**Example Usage:**

```typescript
const mockProvider = new MockNewsProvider();
const articles = await mockProvider.fetchArticles(10);
// Returns 10 fake articles
```

---

## NewsIngestionService

Orchestrates article ingestion from all providers.

### Key Methods

#### 1. Register Providers

```typescript
const service = new NewsIngestionService();
service.registerProvider(new MockNewsProvider());
service.registerProvider(new ReutersProvider()); // future
```

#### 2. Ingest from All Providers

```typescript
const count = await service.ingestFromAllProviders(limit);
// Fetches from all registered providers
// Returns total number of articles ingested
```

#### 3. Ingest from Specific Provider

```typescript
const provider = new MockNewsProvider();
const count = await service.ingestFromProvider(provider, 10);
```

#### 4. Get Recent Articles

```typescript
// All sources
const articles = await service.getRecentArticles(50);

// Specific source
const mockArticles = await service.getRecentArticles(50, 'mock');
```

#### 5. Get Statistics

```typescript
const stats = await service.getArticleCountBySource();
// Returns: [{ source: 'mock', count: 15 }, ...]
```

#### 6. Cleanup Old Articles

```typescript
const deleted = await service.deleteOldArticles(30);
// Deletes articles older than 30 days
```

---

## API Endpoints

### POST /api/v1/news/ingest

Trigger manual ingestion.

**Request:**
```http
POST /api/v1/news/ingest?limit=10
Headers:
  x-user-id: <user-id>
```

**Response:**
```json
{
  "success": true,
  "articlesIngested": 10,
  "message": "Successfully ingested 10 articles"
}
```

---

### GET /api/v1/news/articles

Get recent articles from database.

**Request:**
```http
GET /api/v1/news/articles?limit=50&source=mock
Headers:
  x-user-id: <user-id>
```

**Response:**
```json
{
  "articles": [
    {
      "id": "uuid",
      "source": "mock",
      "title": "Federal Reserve Signals Potential Rate Changes",
      "content": "Financial markets responded...",
      "url": "https://mock-news.example.com/article/1/...",
      "publishedAt": "2026-01-17T18:00:00.000Z",
      "createdAt": "2026-01-17T20:30:00.000Z"
    }
  ],
  "count": 50
}
```

---

### GET /api/v1/news/stats

Get ingestion statistics.

**Request:**
```http
GET /api/v1/news/stats
Headers:
  x-user-id: <user-id>
```

**Response:**
```json
{
  "totalArticles": 150,
  "bySource": [
    { "source": "mock", "count": 100 },
    { "source": "reuters", "count": 50 }
  ]
}
```

---

### DELETE /api/v1/news/cleanup

Delete old articles.

**Request:**
```http
DELETE /api/v1/news/cleanup?days=30
Headers:
  x-user-id: <user-id>
```

**Response:**
```json
{
  "success": true,
  "deletedCount": 45,
  "message": "Deleted 45 articles older than 30 days"
}
```

---

## Testing

### Test Ingestion

```bash
# Ingest 10 mock articles
curl -X POST "http://localhost:3000/api/v1/news/ingest?limit=10" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111"

# Response:
# {
#   "success": true,
#   "articlesIngested": 10,
#   "message": "Successfully ingested 10 articles"
# }
```

### Get Articles

```bash
curl "http://localhost:3000/api/v1/news/articles?limit=5" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111"
```

### Get Stats

```bash
curl "http://localhost:3000/api/v1/news/stats" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111"
```

---

## Adding New Providers

### Example: Reuters Provider

```typescript
export class ReutersProvider implements NewsSourceProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getSourceName(): string {
    return 'reuters';
  }

  async fetchArticles(limit: number = 10): Promise<NewsArticle[]> {
    // Call Reuters API
    const response = await fetch(
      `https://api.reuters.com/articles?limit=${limit}`,
      { headers: { 'API-Key': this.apiKey } }
    );
    
    const data = await response.json();
    
    // Transform to NewsArticle format
    return data.articles.map(article => ({
      source: 'reuters',
      title: article.headline,
      content: article.body,
      url: article.link,
      publishedAt: new Date(article.published),
    }));
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && this.apiKey.length > 0;
  }
}
```

### Register It

```typescript
// In src/routes/news.ts or app.ts
const reutersApiKey = process.env.REUTERS_API_KEY;
if (reutersApiKey) {
  newsService.registerProvider(new ReutersProvider(reutersApiKey));
}
```

---

## Background Job (Future)

For automated ingestion:

```typescript
// src/workers/news-ingestion.worker.ts
import { CronJob } from 'cron';
import { NewsIngestionService } from '../services/news-ingestion.service';
import { MockNewsProvider } from '../providers/MockNewsProvider';

const service = new NewsIngestionService();
service.registerProvider(new MockNewsProvider());

// Run every hour
const job = new CronJob('0 * * * *', async () => {
  console.log('Running scheduled news ingestion...');
  const count = await service.ingestFromAllProviders(20);
  console.log(`Ingested ${count} articles`);
});

job.start();
```

---

## Key Design Decisions

### ✅ Why Interface-Based?
- Easy to add new providers without changing core logic
- Each provider can have different authentication/API patterns
- Mock providers for testing

### ✅ Why Raw Storage?
- Separation of concerns (ingestion ≠ analysis)
- Analysis can be added later without re-ingesting
- Can re-process articles with different algorithms

### ✅ Why Unique URL Constraint?
- Prevents duplicate articles
- Idempotent ingestion (can run multiple times safely)
- Natural deduplication

### ✅ Why Source Field?
- Track which provider each article came from
- Filter by source
- Monitor provider quality

---

## Status

| Component | Status |
|-----------|--------|
| Database Schema | ✅ Complete |
| Interface | ✅ Complete |
| MockNewsProvider | ✅ Complete |
| NewsIngestionService | ✅ Complete |
| API Routes | ✅ Complete |
| Documentation | ✅ Complete |
| Automated Jobs | 📋 Future |
| Real Providers | 📋 Future |

---

## Next Steps

1. ✅ **MVP Complete** - Raw ingestion working
2. 📋 **Feature 2** - Add sentiment analysis
3. 📋 **Feature 3** - Add narrative detection
4. 📋 **Feature 4** - Add real news providers (Reuters, Bloomberg)
5. 📋 **Feature 5** - Add background job for automated ingestion

**Current: Raw ingestion with mock data - ready for testing!**

