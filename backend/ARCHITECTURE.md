# Backend Architecture: Social Trading Community Platform

## High-Level Architecture

```
┌─────────────────┐
│  React Native   │
│  Mobile App     │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────────────────────────────────────┐
│           API Gateway / Express Server          │
│  - Authentication Middleware                    │
│  - Rate Limiting                               │
│  - Request Validation                          │
└────────┬────────────────────────────────────────┘
         │
    ┌────┴────┐
    │        │
┌───▼───┐ ┌─▼────────┐
│  API  │ │ Workers  │
│ Layer │ │  Jobs    │
└───┬───┘ └─┬────────┘
    │       │
┌───▼───────▼───────┐
│   Service Layer   │
│  - Friends        │
│  - Leaderboards   │
│  - Narratives     │
│  - Social Feed    │
└───┬───────────────┘
    │
┌───▼───────────────┐
│  Database Layer   │
│   PostgreSQL      │
└───────────────────┘
```

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js (REST API)
- **Database**: PostgreSQL
- **ORM**: Prisma (for type-safe database access)
- **Background Jobs**: Bull (Redis-based job queue)
- **Caching**: Redis (for leaderboards, rate limiting)
- **Validation**: Zod (runtime type validation)

### Why REST over GraphQL?

For this MVP, REST is chosen because:
1. Simpler to implement and maintain
2. Better suited for mobile apps with predictable data needs
3. Easier caching and rate limiting
4. Team familiarity
5. Can migrate to GraphQL later if needed

## Database Schema

### Core Tables

#### `users`
```sql
- id: UUID (PRIMARY KEY)
- username: VARCHAR(50) UNIQUE NOT NULL
- email: VARCHAR(255) UNIQUE
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- profile_metadata: JSONB (optional style tags)
```

#### `friendships`
Symmetric relationship (bidirectional friendship)
```sql
- id: UUID (PRIMARY KEY)
- user_id: UUID (FK -> users.id)
- friend_id: UUID (FK -> users.id)
- created_at: TIMESTAMP
- UNIQUE(user_id, friend_id)
- CHECK(user_id != friend_id)
- INDEX(user_id)
- INDEX(friend_id)
```

#### `user_metrics`
Aggregated trading metrics per time period (for leaderboards)
```sql
- id: UUID (PRIMARY KEY)
- user_id: UUID (FK -> users.id)
- period: VARCHAR(20) -- 'today', 'week', 'month', 'all_time'
- return_percent: DECIMAL(10, 2)
- win_rate: DECIMAL(5, 2) -- percentage
- trades_count: INTEGER
- calculated_at: TIMESTAMP
- UNIQUE(user_id, period)
- INDEX(user_id, period)
```

#### `narratives`
Market narratives (stories, not tickers)
```sql
- id: UUID (PRIMARY KEY)
- title: VARCHAR(255) NOT NULL
- description: TEXT
- trigger_type: VARCHAR(50) -- 'event', 'person', 'source', etc.
- trigger_value: VARCHAR(255) -- e.g., 'Elon Musk', 'Fed Decision'
- sentiment: VARCHAR(20) -- 'bullish', 'bearish', 'neutral'
- mention_count: INTEGER DEFAULT 0
- velocity: DECIMAL(10, 2) -- % change in mentions
- status: VARCHAR(20) DEFAULT 'active' -- 'active', 'archived'
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- INDEX(status, created_at DESC)
```

#### `narrative_assets`
Many-to-many: narratives affect multiple assets
```sql
- id: UUID (PRIMARY KEY)
- narrative_id: UUID (FK -> narratives.id)
- asset_symbol: VARCHAR(20) NOT NULL -- e.g., 'NVDA', 'BTC'
- impact: DECIMAL(10, 2) -- price change % if available
- created_at: TIMESTAMP
- UNIQUE(narrative_id, asset_symbol)
- INDEX(narrative_id)
```

#### `narrative_events`
Timeline events for narratives
```sql
- id: UUID (PRIMARY KEY)
- narrative_id: UUID (FK -> narratives.id)
- event_time: TIMESTAMP
- description: TEXT
- created_at: TIMESTAMP
- INDEX(narrative_id, event_time)
```

#### `social_posts`
User-generated social feed posts
```sql
- id: UUID (PRIMARY KEY)
- user_id: UUID (FK -> users.id)
- content: TEXT NOT NULL
- sentiment: VARCHAR(20) -- 'bullish', 'bearish', 'neutral'
- likes_count: INTEGER DEFAULT 0
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- INDEX(user_id, created_at DESC)
```

#### `post_tickers`
Many-to-many: posts mention tickers
```sql
- id: UUID (PRIMARY KEY)
- post_id: UUID (FK -> social_posts.id)
- ticker: VARCHAR(20) NOT NULL
- INDEX(post_id)
```

#### `tracked_accounts`
Twitter/X accounts we track for data ingestion
```sql
- id: UUID (PRIMARY KEY)
- platform: VARCHAR(50) DEFAULT 'twitter' -- 'twitter', 'x', etc.
- account_handle: VARCHAR(100) UNIQUE NOT NULL -- '@elonmusk'
- account_name: VARCHAR(255)
- account_type: VARCHAR(50) -- 'celebrity', 'politician', 'influencer', 'blogger'
- is_active: BOOLEAN DEFAULT true
- last_fetched_at: TIMESTAMP
- created_at: TIMESTAMP
- INDEX(is_active, platform)
```

#### `ingested_posts`
Posts ingested from external platforms (Twitter/X)
```sql
- id: UUID (PRIMARY KEY)
- tracked_account_id: UUID (FK -> tracked_accounts.id)
- external_post_id: VARCHAR(255) UNIQUE NOT NULL
- content: TEXT NOT NULL
- posted_at: TIMESTAMP
- engagement_likes: INTEGER DEFAULT 0
- engagement_retweets: INTEGER DEFAULT 0
- keywords: TEXT[] -- extracted keywords
- tickers: VARCHAR(20)[] -- extracted tickers
- hashtags: VARCHAR(100)[]
- narrative_id: UUID (FK -> narratives.id) NULLABLE -- grouped into narrative
- ingested_at: TIMESTAMP
- INDEX(tracked_account_id, posted_at DESC)
- INDEX(narrative_id)
```

#### `community_pulse`
Aggregated community signals (calculated periodically)
```sql
- id: UUID (PRIMARY KEY)
- narrative_id: UUID (FK -> narratives.id)
- bullish_percent: DECIMAL(5, 2)
- bearish_percent: DECIMAL(5, 2)
- neutral_percent: DECIMAL(5, 2)
- discussion_count: INTEGER
- calculated_at: TIMESTAMP
- period: VARCHAR(20) -- 'hour', 'day', 'week'
- INDEX(narrative_id, calculated_at DESC)
```

## API Endpoints

### Authentication
(Assumed to exist - userId available via middleware)

### Friends

#### `POST /api/v1/friends/qr/resolve`
Resolve QR code and add friend (auto-add in MVP)
```json
Request: { "qrData": "risklaba:friend:username" }
Response: { "success": true, "friendId": "uuid", "username": "alice" }
```

#### `POST /api/v1/friends/add`
Manually add friend by userId
```json
Request: { "friendId": "uuid" }
Response: { "success": true }
```

#### `GET /api/v1/friends`
Get user's friend list
```json
Response: {
  "friends": [
    { "id": "uuid", "username": "alice", "addedAt": "2024-01-01T00:00:00Z" }
  ]
}
```

### Leaderboards

#### `GET /api/v1/leaderboard`
Get leaderboard (global or friends)
```json
Query params:
  - scope: 'global' | 'friends' (default: 'global')
  - period: 'today' | 'week' | 'month' | 'all-time' (default: 'today')
  - limit: number (default: 100)
  - offset: number (default: 0)

Response: {
  "entries": [
    {
      "rank": 1,
      "userId": "uuid",
      "username": "CryptoKing",
      "returnPercent": 142.5,
      "winRate": 78,
      "tradesCount": 234
    }
  ],
  "currentUserRank": 15,
  "total": 1000
}
```

### Market Narratives

#### `GET /api/v1/narratives`
Get active narratives
```json
Query params:
  - limit: number (default: 20)
  - offset: number (default: 0)
  - sentiment: 'bullish' | 'bearish' | 'neutral' (optional filter)

Response: {
  "narratives": [
    {
      "id": "uuid",
      "title": "AI is trending on X",
      "description": "Increased discussion about AI",
      "trigger": { "type": "person", "value": "Elon Musk" },
      "sentiment": "bullish",
      "mentionCount": 1250,
      "velocity": 280.5,
      "affectedAssets": ["NVDA", "MSFT", "AAPL"],
      "timeline": [
        { "time": "09:12", "description": "AI mentions spike" },
        { "time": "10:40", "description": "Public figure comment" }
      ],
      "createdAt": "2024-01-01T09:00:00Z"
    }
  ],
  "total": 50
}
```

#### `GET /api/v1/narratives/:id`
Get single narrative details
```json
Response: {
  "id": "uuid",
  "title": "...",
  // ... full narrative object
}
```

### Social Feed

#### `GET /api/v1/feed`
Get social feed posts
```json
Query params:
  - limit: number (default: 20)
  - offset: number (default: 0)
  - sentiment: 'bullish' | 'bearish' | 'neutral' (optional)
  - ticker: string (optional filter by ticker)

Response: {
  "posts": [
    {
      "id": "uuid",
      "author": "Market Analyst",
      "handle": "@marketwizard",
      "content": "Strong earnings beat for $NVDA...",
      "tickersMentioned": ["NVDA"],
      "sentiment": "bullish",
      "timestamp": "2024-01-01T10:00:00Z",
      "likes": 142
    }
  ],
  "total": 500
}
```

#### `POST /api/v1/feed`
Create new post
```json
Request: {
  "content": "Strong earnings beat for $NVDA",
  "sentiment": "bullish",
  "tickers": ["NVDA"]
}

Response: {
  "id": "uuid",
  "success": true
}
```

### Community Pulse

#### `GET /api/v1/community/pulse`
Get aggregated community signals
```json
Query params:
  - period: 'hour' | 'day' | 'week' (default: 'day')

Response: {
  "overallSentiment": {
    "bullish": 65.5,
    "bearish": 20.3,
    "neutral": 14.2
  },
  "topNarrative": {
    "id": "uuid",
    "title": "AI is trending on X",
    "discussionCount": 1250
  },
  "fastestGrowing": {
    "id": "uuid",
    "title": "Rate cuts speculation",
    "velocity": 280.5
  }
}
```

## Background Jobs / Workers

### 1. Twitter/X Data Ingestion Worker
**Frequency**: Every 15 minutes
**Purpose**: Fetch posts from tracked accounts
**Process**:
1. Get list of active tracked accounts
2. For each account, fetch recent posts (since last_fetched_at)
3. Extract keywords, tickers, hashtags
4. Store in `ingested_posts`
5. Update `last_fetched_at`
6. Trigger narrative grouping job

### 2. Narrative Grouping Worker
**Frequency**: Triggered after ingestion (or every hour)
**Purpose**: Group posts into narratives
**Process**:
1. Analyze recent ingested posts for patterns
2. Match to existing narratives or create new ones
3. Update narrative metrics (mention_count, velocity)
4. Link posts to narratives

### 3. Leaderboard Calculation Worker
**Frequency**: Every hour (or on-demand)
**Purpose**: Calculate user metrics for leaderboards
**Process**:
1. Aggregate trading data by period (today, week, month, all-time)
2. Calculate return_percent, win_rate, trades_count
3. Update `user_metrics` table
4. Optionally cache top rankings in Redis

### 4. Community Pulse Worker
**Frequency**: Every 15 minutes
**Purpose**: Calculate aggregated community signals
**Process**:
1. Aggregate sentiment across narratives
2. Calculate fastest-growing narratives (by velocity)
3. Identify most discussed narrative
4. Store in `community_pulse` table

## Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── env.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── friends.ts
│   │   ├── leaderboard.ts
│   │   ├── narratives.ts
│   │   ├── feed.ts
│   │   └── pulse.ts
│   ├── services/
│   │   ├── friends.service.ts
│   │   ├── leaderboard.service.ts
│   │   ├── narratives.service.ts
│   │   ├── feed.service.ts
│   │   └── pulse.service.ts
│   ├── workers/
│   │   ├── ingestion.worker.ts
│   │   ├── narrative-grouping.worker.ts
│   │   ├── leaderboard.worker.ts
│   │   └── pulse.worker.ts
│   ├── utils/
│   │   ├── ticker-extractor.ts
│   │   ├── sentiment-analyzer.ts
│   │   └── qr-code.ts
│   └── app.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## MVP vs Future Extensions

### MVP (Current Focus)
✅ Friend system (QR codes, auto-add)
✅ Leaderboards (global + friends, time ranges)
✅ Market narratives (CRUD, listing)
✅ Social feed (create + read posts)
✅ Basic data ingestion structure
✅ Community pulse aggregation

### Future Extensions
- Comments on posts
- Post likes/reactions
- Narrative following/fading
- Real-time WebSocket updates
- Advanced sentiment analysis (ML)
- Portfolio tracking for celebrities
- Push notifications
- GraphQL API layer
- Analytics dashboard
- User profiles with trading history

## Deployment Considerations

### Development
- Local PostgreSQL
- Local Redis (or Docker)
- Node.js process for API
- Separate worker processes (or same process with Bull)

### Production
- PostgreSQL (managed service or self-hosted)
- Redis cluster
- API servers (multiple instances behind load balancer)
- Worker servers (separate from API)
- Cron scheduler (or Kubernetes CronJobs)
- Monitoring (Prometheus, Grafana)
- Logging (ELK stack or cloud logging)

## Security Considerations

1. **Authentication**: Assume JWT tokens, validate in middleware
2. **Rate Limiting**: Per-user limits on all endpoints
3. **Input Validation**: All inputs validated with Zod
4. **SQL Injection**: Prisma prevents SQL injection
5. **CORS**: Configured for mobile app domain
6. **Data Privacy**: Friendships are private (users only see their own)
7. **QR Codes**: Include expiration and validation

