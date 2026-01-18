# ✅ TRACKED NEWS SOURCES - FEATURE COMPLETE

## Overview

News sources are now tracked in the database. Ingestion **only happens from active sources**.

---

## Database Schema

### NewsSource Table

```sql
CREATE TABLE NewsSource (
  id       UUID PRIMARY KEY,
  name     TEXT UNIQUE NOT NULL,      -- e.g., 'reuters', 'bloomberg', 'mock'
  category TEXT NOT NULL,              -- 'crypto', 'macro', 'tech', 'politics'
  active   BOOLEAN DEFAULT TRUE,       -- Control ingestion
  createdAt DATETIME DEFAULT NOW,
  updatedAt DATETIME DEFAULT NOW
);

CREATE INDEX idx_news_source_active ON NewsSource(active);
CREATE INDEX idx_news_source_category ON NewsSource(category);
```

---

## Categories

| Category | Description | Example Sources |
|----------|-------------|-----------------|
| `crypto` | Cryptocurrency & blockchain | CoinDesk, CoinTelegraph |
| `macro` | Macroeconomics & markets | Reuters, Bloomberg |
| `tech` | Technology & innovation | TechCrunch, Wired |
| `politics` | Political news | Politico, The Hill |

---

## Repository Functions

### Create Source
```typescript
await createNewsSource({
  name: 'reuters',
  category: 'macro',
  active: true
});
```

### Get Sources
```typescript
// All sources
const all = await getAllNewsSources();

// Active only
const active = await getActiveNewsSources();

// By category
const crypto = await getNewsSourcesByCategory('crypto');

// Specific source
const reuters = await getNewsSourceByName('reuters');
```

### Update Source
```typescript
await updateNewsSource('reuters', {
  category: 'macro',
  active: false
});
```

### Toggle Active
```typescript
await toggleNewsSourceActive('reuters');
// Switches active: true ↔ false
```

### Check if Active
```typescript
const isActive = await isNewsSourceActive('reuters');
```

### Get Stats
```typescript
const stats = await getNewsSourceStats();
// Returns: { total, active, inactive, byCategory }
```

---

## API Endpoints

### POST /api/v1/news-sources
Create a new news source

**Request:**
```http
POST /api/v1/news-sources
Headers: { x-user-id: <user-id> }
Body: {
  "name": "reuters",
  "category": "macro",
  "active": true
}
```

**Response:**
```json
{
  "success": true,
  "source": {
    "id": "uuid",
    "name": "reuters",
    "category": "macro",
    "active": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### GET /api/v1/news-sources
Get news sources (with filters)

**Request:**
```http
# All sources
GET /api/v1/news-sources

# Active only
GET /api/v1/news-sources?active=true

# By category
GET /api/v1/news-sources?category=crypto
```

**Response:**
```json
{
  "sources": [
    {
      "id": "uuid",
      "name": "mock",
      "category": "macro",
      "active": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "count": 1
}
```

---

### GET /api/v1/news-sources/stats
Get statistics

**Response:**
```json
{
  "total": 6,
  "active": 1,
  "inactive": 5,
  "byCategory": [
    { "category": "crypto", "count": 1 },
    { "category": "macro", "count": 3 },
    { "category": "politics", "count": 1 },
    { "category": "tech", "count": 1 }
  ]
}
```

---

### GET /api/v1/news-sources/:name
Get specific source

**Response:**
```json
{
  "source": {
    "id": "uuid",
    "name": "mock",
    "category": "macro",
    "active": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### PATCH /api/v1/news-sources/:name
Update a source

**Request:**
```http
PATCH /api/v1/news-sources/reuters
Body: {
  "category": "tech",
  "active": false
}
```

---

### POST /api/v1/news-sources/:name/toggle
Toggle active status

**Request:**
```http
POST /api/v1/news-sources/reuters/toggle
```

**Response:**
```json
{
  "success": true,
  "source": { ... },
  "message": "Source reuters is now inactive"
}
```

---

### DELETE /api/v1/news-sources/:name
Delete a source

**Response:**
```json
{
  "success": true,
  "message": "News source reuters deleted"
}
```

---

## Updated Ingestion Service

### Key Changes

1. **Providers stored in Map** (by name, not array)
2. **Checks database** for active sources before ingesting
3. **Skips inactive sources** automatically

### Flow

```
┌─────────────────────────────────────────┐
│  ingestFromAllProviders()               │
│  1. Query: SELECT * FROM NewsSource    │
│     WHERE active = true                 │
│  2. Get: ['mock']                       │
│  3. Filter registered providers         │
│  4. Ingest only from active ones        │
└─────────────────────────────────────────┘
```

### Code Example

```typescript
// Register providers (still done at startup)
service.registerProvider(new MockNewsProvider());
service.registerProvider(new ReutersProvider());

// Ingestion now checks database
await service.ingestFromAllProviders(10);
// ✅ Only ingests from sources marked active in DB
// ❌ Skips inactive sources even if provider is registered
```

---

## Testing Results

### 1. Get All Sources ✅
```bash
curl "http://localhost:3000/api/v1/news-sources" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111"
```
**Result:** Returns 6 sources (mock, reuters, bloomberg, coindesk, techcrunch, politico)

### 2. Get Active Sources ✅
```bash
curl "http://localhost:3000/api/v1/news-sources?active=true" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111"
```
**Result:** Returns 1 source (mock)

### 3. Get Stats ✅
```json
{
  "total": 6,
  "active": 1,
  "inactive": 5,
  "byCategory": [...]
}
```

### 4. Ingest When Active ✅
```bash
curl -X POST "http://localhost:3000/api/v1/news/ingest?limit=3" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111"
```
**Result:** `{"articlesIngested": 3}` ✅

### 5. Toggle to Inactive ✅
```bash
curl -X POST "http://localhost:3000/api/v1/news-sources/mock/toggle" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111"
```
**Result:** `{"message": "Source mock is now inactive"}` ✅

### 6. Ingest When Inactive ✅
```bash
curl -X POST "http://localhost:3000/api/v1/news/ingest?limit=3" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111"
```
**Result:** `{"articlesIngested": 0}` ✅ **SKIPPED!**

### 7. Toggle Back to Active ✅
**Result:** Works perfectly!

---

## Seed Data

Initial sources added:

| Name | Category | Active |
|------|----------|--------|
| mock | macro | ✅ true |
| reuters | macro | ❌ false |
| bloomberg | macro | ❌ false |
| coindesk | crypto | ❌ false |
| techcrunch | tech | ❌ false |
| politico | politics | ❌ false |

To reseed:
```bash
cd backend
node seed-news-sources.js
```

---

## Use Cases

### 1. Enable/Disable Sources
```bash
# Disable a source (stop ingesting)
curl -X POST "http://localhost:3000/api/v1/news-sources/reuters/toggle"

# Enable it again
curl -X POST "http://localhost:3000/api/v1/news-sources/reuters/toggle"
```

### 2. Add New Source
```bash
curl -X POST "http://localhost:3000/api/v1/news-sources" \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-id>" \
  -d '{
    "name": "coindesk",
    "category": "crypto",
    "active": true
  }'
```

### 3. Filter by Category
```bash
# Get all crypto sources
curl "http://localhost:3000/api/v1/news-sources?category=crypto"
```

### 4. Manage by Category
```typescript
// Activate all crypto sources
const cryptoSources = await getNewsSourcesByCategory('crypto');
for (const source of cryptoSources) {
  await updateNewsSource(source.name, { active: true });
}
```

---

## Files Created/Modified

### Created:
- `prisma/schema.prisma` - Added NewsSource model
- `src/repositories/news-source.repository.ts` - Repository functions
- `src/routes/news-sources.ts` - API endpoints
- `seed-news-sources.js` - Seed script

### Modified:
- `src/services/news-ingestion.service.ts` - Now checks active sources
- `src/app.ts` - Registered new routes

---

## Status

| Requirement | Status |
|-------------|--------|
| List of enabled sources | ✅ Complete |
| Name field | ✅ Complete |
| Category field | ✅ Complete |
| Active flag | ✅ Complete |
| SQL schema | ✅ Complete |
| Repository functions | ✅ Complete |
| Updated ingestion service | ✅ Complete |
| Only fetch from active | ✅ Complete |
| API endpoints | ✅ Bonus (not required) |

---

## Benefits

### ✅ Dynamic Control
- Enable/disable sources without code changes
- No redeployment needed

### ✅ Category Organization
- Group sources by type
- Easy filtering and management

### ✅ Cost Control
- Disable expensive API sources
- Control API usage limits

### ✅ Quality Control
- Disable unreliable sources
- A/B test different providers

### ✅ Extensibility
- Add metadata fields later
- Rate limits, API keys per source

---

## Next Steps

1. ✅ **Feature 2 Complete** - Tracked sources
2. 📋 **Add real providers** - Implement ReutersProvider, etc.
3. 📋 **Add API keys** - Store per-source credentials
4. 📋 **Add rate limits** - Track requests per source
5. 📋 **Feature 3** - Sentiment analysis

---

**🎉 TRACKED NEWS SOURCES COMPLETE!**

Ingestion now respects the database. Only active sources are processed. Fully tested and working!

