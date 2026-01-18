# RiskLaba Backend API

Backend API for the RiskLaba social trading community platform.

## Overview

This backend powers the Community page features:
- **Leaderboards** (global + friends)
- **Market Narratives**
- **Social feed** with sentiment
- **Friend system** via QR codes
- **Community pulse** & analytics
- **News ingestion** & storage
- **Entity extraction** (keywords, tickers, people, orgs)
- **Tracked news sources** management

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma
- **Validation**: Zod
- **Testing**: Jest

## Features

### ✅ Friend System
- QR code-based friend adding
- Symmetric friendships (no requests)
- See: Friend endpoints below

### ✅ News Ingestion
- Fetch articles from multiple sources
- Abstract provider interface
- **Real news from NewsAPI.org** ✨ NEW!
- **Real crypto news from CryptoPanic** ✨ NEW!
- Mock provider for testing
- See: `NEWSAPI_PROVIDER_COMPLETE.md`, `NEWS_INGESTION_COMPLETE.md`

### ✅ Tracked News Sources
- Database-backed source management
- Enable/disable sources dynamically
- Category organization (crypto, macro, tech, politics)
- See: `TRACKED_NEWS_SOURCES_COMPLETE.md`

### ✅ Entity Extraction
- Rule-based extraction (no ML)
- Extract: keywords, tickers ($NVDA), people, organizations
- Automatic extraction during ingestion
- Unit tested (15+ tests)
- See: `ENTITY_EXTRACTION_COMPLETE.md`

## Setup

### Prerequisites

- Node.js 18+ 

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Initialize database
npx prisma db push

# Seed news sources
node seed-news-sources.js
```

### Environment Variables

```bash
# NewsAPI.org (general news)
NEWSAPI_KEY=your_newsapi_key

# CryptoPanic (crypto news)
CRYPTOPANIC_TOKEN=your_cryptopanic_token
# Optional override (defaults to CryptoPanic developer API base)
CRYPTOPANIC_BASE_URL=https://cryptopanic.com/api/developer/v2
```

### Development

```bash
# Start API server
npm run dev
```

## API Endpoints

All endpoints require authentication via `x-user-id` header (MVP). In production, use JWT tokens.

### Friends

- `POST /api/v1/friends/qr/resolve` - Resolve QR code and add friend
- `POST /api/v1/friends/add` - Manually add friend
- `GET /api/v1/friends` - Get friend list

### News

**Ingestion:**
- `POST /api/v1/news/ingest?limit=10` - Trigger news ingestion from active sources (mock + newsapi)
- `GET /api/v1/news/articles?skip=0&take=10` - Get articles
- `GET /api/v1/news/stats` - Get article statistics
- `DELETE /api/v1/news/cleanup?daysOld=30` - Delete old articles

**Providers:**
- ✅ **NewsAPI** - Real news from NewsAPI.org (requires `NEWSAPI_KEY`)
- ✅ **CryptoPanic** - Real crypto news from CryptoPanic (requires `CRYPTOPANIC_TOKEN`)
- ✅ **Mock** - Testing data

### News Sources

- `POST /api/v1/news-sources` - Create news source
- `GET /api/v1/news-sources` - List all sources
- `GET /api/v1/news-sources?active=true` - List active sources only
- `GET /api/v1/news-sources?category=crypto` - Filter by category
- `GET /api/v1/news-sources/stats` - Get source statistics
- `GET /api/v1/news-sources/:name` - Get specific source
- `PATCH /api/v1/news-sources/:name` - Update source
- `POST /api/v1/news-sources/:name/toggle` - Toggle active status
- `DELETE /api/v1/news-sources/:name` - Delete source

### Entities

- `GET /api/v1/entities/:articleId` - Get entities for article
- `GET /api/v1/entities/tickers/all?limit=100` - Get all tickers
- `GET /api/v1/entities/keywords/top?limit=50` - Get top keywords
- `GET /api/v1/entities/stats/all` - Get entity statistics
- `GET /api/v1/entities/search?entity=$NVDA` - Find articles by entity
- `POST /api/v1/entities/extract` - Test extraction on text

### Leaderboards

- `GET /api/v1/leaderboard?scope=global|friends&period=today|week|month|all-time` - Get leaderboard

### Market Narratives

- `GET /api/v1/narratives` - Get active narratives
- `GET /api/v1/narratives/:id` - Get narrative details

### Social Feed

- `GET /api/v1/feed` - Get social feed posts
- `POST /api/v1/feed` - Create new post

### Community Pulse

- `GET /api/v1/community/pulse?period=hour|day|week` - Get aggregated signals

## Database Schema

See `ARCHITECTURE.md` for full schema documentation.

Key tables:
- `users` - User accounts
- `friendships` - Friend relationships (bidirectional)
- `user_metrics` - Trading metrics for leaderboards
- `narratives` - Market narratives
- `social_posts` - User-generated posts
- `ingested_posts` - Posts from external sources (Twitter/X)
- `tracked_accounts` - Accounts we track for data ingestion

## Workers / Background Jobs

Workers are defined but not fully implemented yet. They will handle:
- Twitter/X data ingestion
- Narrative grouping
- Leaderboard calculations
- Community pulse aggregation

## Authentication

For MVP, authentication is simplified:
- `x-user-id` header contains the user ID
- In production, replace `middleware/auth.ts` with real JWT validation

## Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- NewsApiProvider.test.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

**Current Test Suite:**
- ✅ NewsApiProvider: 16/16 tests passing
- ✅ Entity Extraction: 15+ tests passing

## Production Deployment

1. Set up PostgreSQL database
2. Set up Redis instance
3. Set environment variables
4. Run migrations: `npm run db:migrate`
5. Build: `npm run build`
6. Start: `npm start`
7. Start workers separately

## Architecture

See `ARCHITECTURE.md` for detailed architecture documentation.

