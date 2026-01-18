# ✅ NARRATIVE FOLLOW/UNFOLLOW - FEATURE COMPLETE

## Overview

Users can follow narratives to track stories they're interested in. **Fast lookups** with unique constraints to prevent duplicates.

---

## Database Schema

### NarrativeFollower

```sql
CREATE TABLE NarrativeFollower (
  id          UUID PRIMARY KEY,
  userId      UUID NOT NULL,
  narrativeId UUID NOT NULL,
  createdAt   DATETIME DEFAULT NOW,
  
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (narrativeId) REFERENCES DetectedNarrative(id) ON DELETE CASCADE,
  
  UNIQUE(userId, narrativeId)
);

CREATE INDEX idx_narrative_follower_user_id ON NarrativeFollower(userId);
CREATE INDEX idx_narrative_follower_narrative_id ON NarrativeFollower(narrativeId);
```

**Key Features:**
- **Unique constraint** on (userId, narrativeId) → prevents duplicate follows
- **Indexes** on both userId and narrativeId → fast lookups
- **Cascade delete** → cleanup when user or narrative is deleted

---

## API Endpoints

### POST /api/v1/narratives-detected/:id/follow

Follow a narrative.

**Request:**
```http
POST /api/v1/narratives-detected/{narrative-id}/follow
Headers: { x-user-id: <user-id> }
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully followed narrative",
  "follow": {
    "narrativeId": "uuid",
    "title": "$NVDA Market Movement",
    "followedAt": "2026-01-17T21:03:17.628Z"
  }
}
```

**Response (Already Following):**
```json
{
  "error": "Already following this narrative"
}
```
Status: 409 Conflict

---

### POST /api/v1/narratives-detected/:id/unfollow

Unfollow a narrative.

**Request:**
```http
POST /api/v1/narratives-detected/{narrative-id}/unfollow
Headers: { x-user-id: <user-id> }
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully unfollowed narrative"
}
```

**Response (Not Following):**
```json
{
  "error": "Not following this narrative"
}
```
Status: 404 Not Found

---

### GET /api/v1/narratives-detected/:id/following

Check if user is following a narrative.

**Response:**
```json
{
  "narrativeId": "uuid",
  "isFollowing": true
}
```

---

### GET /api/v1/narratives-detected/following

Get all narratives the user is following.

**Response:**
```json
{
  "narratives": [
    {
      "id": "uuid",
      "title": "$NVDA Market Movement",
      "summary": "...",
      "sentiment": "bullish",
      "followedAt": "2026-01-17T...",
      "_count": {
        "articles": 5,
        "followers": 12
      },
      "metrics": [
        {
          "period": "24h",
          "mentionCount": 5,
          "velocity": 150
        }
      ]
    }
  ],
  "count": 3
}
```

---

### GET /api/v1/narratives-detected/:id/followers

Get followers of a narrative.

**Response:**
```json
{
  "narrativeId": "uuid",
  "followers": [
    {
      "userId": "uuid",
      "username": "alice",
      "followedAt": "2026-01-17T..."
    }
  ],
  "count": 1
}
```

---

### GET /api/v1/narratives-detected/most-followed

Get most followed narratives.

**Query Params:** `?limit=10`

**Response:**
```json
{
  "narratives": [
    {
      "id": "uuid",
      "title": "$NVDA Market Movement",
      "summary": "...",
      "sentiment": "bullish",
      "followersCount": 15,
      "articlesCount": 8
    }
  ],
  "count": 10
}
```

---

### GET /api/v1/narratives-detected/following/stats

Get user's follow statistics.

**Response:**
```json
{
  "total": 5,
  "bySentiment": {
    "bullish": 3,
    "bearish": 1,
    "neutral": 1
  }
}
```

---

## Repository Functions

### `followNarrative(userId, narrativeId)`

Follow a narrative.

```typescript
const follow = await followNarrative(
  'user-uuid',
  'narrative-uuid'
);

// Returns: { userId, narrativeId, createdAt, narrative: {...} }
// Throws: Error('Already following') if duplicate
```

### `unfollowNarrative(userId, narrativeId)`

Unfollow a narrative.

```typescript
await unfollowNarrative('user-uuid', 'narrative-uuid');

// Throws: Error('Not following') if not found
```

### `isFollowing(userId, narrativeId)`

Check if user is following.

```typescript
const following = await isFollowing('user-uuid', 'narrative-uuid');
// Returns: true | false
```

### `getFollowedNarratives(userId)`

Get all followed narratives with full details.

```typescript
const narratives = await getFollowedNarratives('user-uuid');
// Returns: Array with narrative details + followedAt timestamp
```

### `getFollowersCount(narrativeId)`

Get follower count.

```typescript
const count = await getFollowersCount('narrative-uuid');
// Returns: number
```

### `getMostFollowedNarratives(limit)`

Get top narratives by follower count.

```typescript
const trending = await getMostFollowedNarratives(10);
// Returns: Array sorted by followers DESC
```

---

## Testing Results

### Follow Functionality ✅

```bash
1. Follow narrative → Success
   {
     "success": true,
     "message": "Successfully followed narrative",
     "follow": {
       "title": "Amazon Web Services Launches Developments",
       "followedAt": "2026-01-17T21:03:17.628Z"
     }
   }

2. Follow again → Duplicate prevented ✅
   {
     "error": "Already following this narrative"
   }
   Status: 409 Conflict

3. Check following status → true ✅
   {
     "narrativeId": "...",
     "isFollowing": true
   }

4. Get followers → Shows user ✅
   {
     "followers": [
       {
         "userId": "...",
         "username": "alice",
         "followedAt": "..."
       }
     ],
     "count": 1
   }

5. Unfollow → Success ✅
   {
     "success": true,
     "message": "Successfully unfollowed narrative"
   }
```

---

## Duplicate Prevention

### Unique Constraint

```sql
UNIQUE(userId, narrativeId)
```

**Behavior:**
- First follow → Success (201 Created)
- Second follow → Error (409 Conflict)
- Database enforces uniqueness
- No race conditions

**Error Handling:**
```typescript
try {
  await prisma.narrativeFollower.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    throw new Error('Already following this narrative');
  }
}
```

---

## Fast Lookups

### Indexes

```sql
CREATE INDEX idx_narrative_follower_user_id ON NarrativeFollower(userId);
CREATE INDEX idx_narrative_follower_narrative_id ON NarrativeFollower(narrativeId);
```

**Performance:**
- `isFollowing(userId, narrativeId)` → O(1) with composite index
- `getFollowedNarratives(userId)` → Fast with userId index
- `getNarrativeFollowers(narrativeId)` → Fast with narrativeId index

**Query Plans:**
```sql
-- Check if following (uses unique index)
SELECT * FROM NarrativeFollower
WHERE userId = ? AND narrativeId = ?
-- Index: userId_narrativeId (unique)

-- Get user's follows (uses userId index)
SELECT * FROM NarrativeFollower
WHERE userId = ?
-- Index: idx_narrative_follower_user_id

-- Get narrative followers (uses narrativeId index)
SELECT * FROM NarrativeFollower
WHERE narrativeId = ?
-- Index: idx_narrative_follower_narrative_id
```

---

## Use Cases

### 1. Follow Breaking News

```bash
# User discovers narrative about $NVDA
curl -X POST "http://localhost:3000/api/v1/narratives-detected/{id}/follow" \
  -H "x-user-id: <user-id>"

# Now they'll get updates about $NVDA developments
```

### 2. Track Portfolio Tickers

```bash
# Follow all narratives about stocks in portfolio
# User holds $NVDA, $AAPL, $TSLA
# Follow each narrative mentioning these tickers
```

### 3. Monitor Sentiment Shifts

```bash
# Get followed narratives with metrics
curl "http://localhost:3000/api/v1/narratives-detected/following" \
  -H "x-user-id: <user-id>"

# Check if sentiment changed from bullish → bearish
# Track velocity changes (momentum shifts)
```

### 4. Social Discovery

```bash
# See most followed narratives
curl "http://localhost:3000/api/v1/narratives-detected/most-followed" \
  -H "x-user-id: <user-id>"

# Follow what other traders are watching
```

---

## Files Created/Modified

### Created:
- `src/repositories/narrative-follower.repository.ts` - Follow logic
- `src/routes/narrative-followers.ts` - API routes (merged into narratives-detected)

### Modified:
- `prisma/schema.prisma` - Added NarrativeFollower model
- `src/routes/narratives-detected.ts` - Added follow routes

---

## Status

| Requirement | Status |
|-------------|--------|
| Data model (narrative_followers) | ✅ Complete |
| user_id, narrative_id, created_at | ✅ Complete |
| POST /:id/follow | ✅ Complete |
| POST /:id/unfollow | ✅ Complete |
| GET /following | ✅ Complete |
| Prevent duplicates | ✅ Complete (unique constraint) |
| Fast lookup | ✅ Complete (indexed) |
| SQL schema | ✅ Complete |
| Routes | ✅ Complete |
| Repository logic | ✅ Complete |

---

## Benefits

### ✅ Personalized Feed
- Users track stories they care about
- Get updates on followed narratives

### ✅ Social Discovery
- See what others are following
- Discover trending narratives

### ✅ Fast Performance
- Indexed lookups (O(1))
- Efficient queries

### ✅ Data Integrity
- Unique constraints prevent duplicates
- Cascade deletes maintain consistency

---

## Next Steps

1. ✅ **Current:** Basic follow/unfollow
2. 📋 **Next:** Notifications for followed narratives (new articles, sentiment shifts)
3. 📋 **Later:** Feed algorithm (prioritize followed narratives)
4. 📋 **Future:** Follow recommendations (similar narratives)

---

**🎉 NARRATIVE FOLLOW/UNFOLLOW COMPLETE!**

Users can now follow narratives with duplicate prevention and fast lookups!

