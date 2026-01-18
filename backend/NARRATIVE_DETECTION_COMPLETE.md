# ✅ NARRATIVE DETECTION - FEATURE COMPLETE

## Overview

Automatic detection of market narratives from news articles by grouping articles with shared entities. **A narrative is a repeated market story, not a single article.**

---

## What is a Narrative?

**Definition:** A pattern of multiple articles discussing the same topic/entities within a time window.

**Examples:**
- 3 articles mentioning `$NVDA` and "Jensen Huang" in 24 hours → **"$NVDA Market Movement"**
- 4 articles about "Elon Musk" and "$TSLA" → **"Elon Musk Developments"**
- 2 articles discussing "Federal Reserve" and "$TLT" → **"Federal Reserve News"**

---

## Detection Algorithm

### Step 1: Group Articles by Shared Entities

```
For each recent article (within time window):
  Extract all significant entities (tickers, people, orgs)
  
For each entity:
  Find all articles that mention this entity
  
Create clusters:
  Group = articles sharing 2+ entities
```

### Step 2: Apply Thresholds

```
For each cluster:
  if cluster.articles >= minArticles (default: 3)
  AND cluster.sharedEntities >= minSharedEntities (default: 2)
  AND cluster.timeSpan <= timeWindowHours (default: 24)
    → CREATE NARRATIVE
```

### Step 3: Generate Title & Summary

```
Title:
  - If tickers: "$NVDA, $AAPL Market Movement"
  - If person: "Elon Musk Developments"
  - If org: "Tesla Inc News"

Summary:
  "{count} articles discussing {entities} {timeSpan}"
  Example: "3 articles discussing $NVDA, Jensen Huang over the last 8 hours"
```

---

## Configuration

### NarrativeConfig

```typescript
{
  minArticles: 3,           // Min articles to form narrative
  timeWindowHours: 24,      // Look back 24 hours
  minSharedEntities: 2      // Min shared entities
}
```

**Tunable Parameters:**
- **Stricter** (fewer narratives): `minArticles: 5, minSharedEntities: 3`
- **Looser** (more narratives): `minArticles: 2, minSharedEntities: 1`
- **Longer window**: `timeWindowHours: 48` (2 days)

---

## Database Schema

### DetectedNarrative

```sql
CREATE TABLE DetectedNarrative (
  id        UUID PRIMARY KEY,
  title     TEXT NOT NULL,
  summary   TEXT NOT NULL,
  createdAt DATETIME DEFAULT NOW,
  updatedAt DATETIME DEFAULT NOW
);

CREATE INDEX idx_detected_narrative_created ON DetectedNarrative(createdAt);
```

### DetectedNarrativeArticle (Join Table)

```sql
CREATE TABLE DetectedNarrativeArticle (
  id          UUID PRIMARY KEY,
  narrativeId UUID NOT NULL,
  articleId   UUID NOT NULL,
  createdAt   DATETIME DEFAULT NOW,
  
  FOREIGN KEY (narrativeId) REFERENCES DetectedNarrative(id) ON DELETE CASCADE,
  FOREIGN KEY (articleId) REFERENCES NewsArticle(id) ON DELETE CASCADE,
  
  UNIQUE(narrativeId, articleId)
);

CREATE INDEX idx_dna_narrative_id ON DetectedNarrativeArticle(narrativeId);
CREATE INDEX idx_dna_article_id ON DetectedNarrativeArticle(articleId);
```

---

## Service Functions

### `detectNarratives(config?): Promise<DetectedNarrative[]>`

Detect narratives from recent articles.

```typescript
const narratives = await detectNarratives({
  minArticles: 3,
  timeWindowHours: 24,
  minSharedEntities: 2
});

// Returns:
[
  {
    title: "$NVDA Market Movement",
    summary: "3 articles discussing $NVDA, Jensen Huang...",
    articleIds: ["uuid1", "uuid2", "uuid3"],
    sharedEntities: ["$NVDA", "Jensen Huang", "Goldman Sachs"]
  }
]
```

### `runNarrativeDetection(config?): Promise<{detected, created}>`

Detect and save narratives to database.

```typescript
const result = await runNarrativeDetection();
// Returns: { detected: 5, created: 5 }
```

---

## API Endpoints

### POST /api/v1/narratives-detected/detect

Run narrative detection on recent articles.

**Request:**
```http
POST /api/v1/narratives-detected/detect
Headers: { x-user-id: <user-id> }
Body: {
  "minArticles": 2,
  "timeWindowHours": 24,
  "minSharedEntities": 2
}
```

**Response:**
```json
{
  "success": true,
  "detected": 5,
  "created": 5,
  "message": "Detected 5 narratives, created 5 new ones"
}
```

---

### GET /api/v1/narratives-detected

Get all detected narratives.

**Query Params:**
- `limit` (optional, default: 50)
- `recent` (optional, hours)

**Response:**
```json
{
  "narratives": [
    {
      "id": "uuid",
      "title": "$NVDA Market Movement",
      "summary": "3 articles discussing...",
      "createdAt": "2026-01-17T...",
      "articles": [
        {
          "article": {
            "id": "uuid",
            "title": "$NVDA Surges on AI Boom",
            "publishedAt": "..."
          }
        }
      ],
      "_count": {
        "articles": 3
      }
    }
  ],
  "count": 5
}
```

---

### GET /api/v1/narratives-detected/stats

Get narrative statistics.

**Response:**
```json
{
  "total": 5,
  "recent24h": 5,
  "totalArticlesInNarratives": 15,
  "avgArticlesPerNarrative": 3
}
```

---

### GET /api/v1/narratives-detected/:id

Get a specific narrative with all articles.

**Response:**
```json
{
  "narrative": {
    "id": "uuid",
    "title": "$NVDA Market Movement",
    "summary": "3 articles...",
    "articles": [
      {
        "article": {
          "id": "uuid",
          "title": "$NVDA Surges...",
          "content": "...",
          "entities": [
            { "entity": "$NVDA", "type": "ticker" },
            { "entity": "Jensen Huang", "type": "person" }
          ]
        }
      }
    ]
  }
}
```

---

### DELETE /api/v1/narratives-detected/cleanup

Delete old narratives.

**Query Params:** `?daysOld=30`

**Response:**
```json
{
  "success": true,
  "deletedCount": 10,
  "message": "Deleted 10 old narratives"
}
```

---

## Testing Results

### Test Data
- **10 articles ingested**
- **292 entities extracted**
  - 200 keywords
  - 48 organizations
  - 31 people
  - 13 tickers

### Detection Results ✅

**Configuration:**
- `minArticles: 2`
- `timeWindowHours: 24`
- `minSharedEntities: 2`

**Detected: 5 narratives**

1. **$TSLA Market Movement**
   - 2 articles discussing $TSLA, Elon Musk, SEC
   - Over 6 hours

2. **$AAPL Market Movement**
   - 2 articles discussing $AAPL, China, Apple Inc
   - Over 2 hours

3. **$BTC, $ETH Market Movement**
   - 2 articles discussing $BTC, $ETH, BlackRock
   - Over 13 hours

4. **$TLT Market Movement**
   - 2 articles discussing $TLT, Federal Reserve, Jerome Powell
   - Over 8 hours

5. **$NVDA Market Movement**
   - 2 articles discussing $NVDA, Jensen Huang, Goldman Sachs
   - Over 2 hours

### Stats ✅
- Total narratives: 5
- Recent (24h): 5
- Total articles in narratives: 10
- Avg articles per narrative: 2

---

## Deterministic Output

**No randomness.** The algorithm is fully deterministic:

✅ **Entity grouping:** Based on exact entity matching  
✅ **Sorting:** Articles sorted by publish time (newest first)  
✅ **Title generation:** Rule-based on entity types  
✅ **Summary generation:** Template-based  

**Same input → Same output every time**

---

## Why Deterministic Matters

1. **Reproducible** - Same run produces same narratives
2. **Testable** - Can write unit tests with expected outputs
3. **Debuggable** - Easy to trace why a narrative was created
4. **Predictable** - No surprise results for users

---

## Grouping Logic

### Priority Order

1. **Tickers** - Highest priority (financial focus)
2. **People** - Medium priority (key figures)
3. **Organizations** - Lower priority (broader)

### Example Flow

```
Articles:
1. "$NVDA surges. Jensen Huang announces chips."
2. "$NVDA upgraded by Goldman Sachs."
3. "Jensen Huang speaks at AI conference."

Entities:
- $NVDA: [Article 1, Article 2]
- Jensen Huang: [Article 1, Article 3]
- Goldman Sachs: [Article 2]

Clusters:
- Cluster 1: [Article 1, Article 2] (share $NVDA)
  → Shared entities: $NVDA, Jensen Huang, Goldman Sachs
  → NARRATIVE: "$NVDA Market Movement"
  
- Cluster 2: [Article 1, Article 3] (share Jensen Huang)
  → But Article 1 already in Cluster 1, skip
```

---

## Files Created/Modified

### Created:
- `prisma/schema.prisma` - DetectedNarrative models
- `src/services/narrative-detection.service.ts` - Detection logic
- `src/repositories/narrative.repository.ts` - Database operations
- `src/routes/narratives-detected.ts` - API endpoints

### Modified:
- `src/app.ts` - Registered narrative routes

---

## Usage Examples

### Manual Detection

```bash
# Detect narratives from last 24 hours (min 3 articles)
curl -X POST "http://localhost:3000/api/v1/narratives-detected/detect" \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-id>" \
  -d '{
    "minArticles": 3,
    "timeWindowHours": 24,
    "minSharedEntities": 2
  }'
```

### Get Recent Narratives

```bash
# Get narratives from last 24 hours
curl "http://localhost:3000/api/v1/narratives-detected?recent=24" \
  -H "x-user-id: <user-id>"
```

### Scheduled Detection

**Recommended:** Run detection every 1-4 hours via cron:

```bash
# Every hour
0 * * * * curl -X POST http://localhost:3000/api/v1/narratives-detected/detect \
  -H "x-user-id: system" \
  -d '{"minArticles": 3}'
```

---

## Status

| Requirement | Status |
|-------------|--------|
| Group by shared entities | ✅ Complete |
| Threshold-based detection | ✅ Complete |
| Deterministic output | ✅ Complete |
| Simple grouping logic | ✅ Complete |
| Data model (narratives) | ✅ Complete |
| Data model (narrative_articles) | ✅ Complete |
| API endpoints | ✅ Complete |
| Repository functions | ✅ Complete |

---

## Benefits

### ✅ Automatic Discovery
- No manual curation needed
- Finds trending stories automatically

### ✅ Real-Time Detection
- Detects narratives as articles come in
- Can run hourly or on-demand

### ✅ Flexible Configuration
- Tune thresholds for your use case
- Adjust time windows dynamically

### ✅ Clean Separation
- Doesn't interfere with original Narrative model
- Uses DetectedNarrative to avoid conflicts

---

## Next Steps

1. ✅ **Current:** Basic narrative detection
2. 📋 **Next:** Narrative trending (velocity, growth)
3. 📋 **Later:** Sentiment per narrative (% bullish/bearish)
4. 📋 **Future:** Narrative impact on markets (price correlation)

---

**🎉 NARRATIVE DETECTION COMPLETE!**

Automatically groups articles into market stories. Fully deterministic, configurable, and tested!

