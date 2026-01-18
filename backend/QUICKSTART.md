# Backend Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ running
- Redis 6+ running (for job queue)

## Setup Steps

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   Create `.env` file:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/risklaba?schema=public"
   REDIS_URL="redis://localhost:6379"
   PORT=3000
   NODE_ENV=development
   ```

3. **Set up database**
   ```bash
   npm run db:generate  # Generate Prisma client
   npm run db:migrate   # Run migrations
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

5. **Test the API**
   ```bash
   curl http://localhost:3000/health
   ```

## API Usage

All endpoints require authentication via `x-user-id` header (MVP).

### Example: Get Leaderboard
```bash
curl "http://localhost:3000/api/v1/leaderboard?scope=global&period=today" \
  -H "x-user-id: user-123"
```

### Example: Add Friend
```bash
curl -X POST http://localhost:3000/api/v1/friends/qr/resolve \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{"qrData": "risklaba:friend:alice"}'
```

### Example: Create Post
```bash
curl -X POST http://localhost:3000/api/v1/feed \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "content": "Strong earnings beat for $NVDA",
    "sentiment": "bullish",
    "tickers": ["NVDA"]
  }'
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run worker:ingestion` - Start ingestion worker
- `npm run worker:leaderboard` - Start leaderboard worker
- `npm run worker:pulse` - Start pulse worker

## API Endpoints

### Friends
- `POST /api/v1/friends/qr/resolve` - Resolve QR code
- `POST /api/v1/friends/add` - Add friend
- `GET /api/v1/friends` - List friends

### Leaderboards
- `GET /api/v1/leaderboard` - Get leaderboard (scope: global|friends, period: today|week|month|all-time)

### Narratives
- `GET /api/v1/narratives` - Get narratives
- `GET /api/v1/narratives/:id` - Get narrative details

### Social Feed
- `GET /api/v1/feed` - Get feed posts
- `POST /api/v1/feed` - Create post

### Community Pulse
- `GET /api/v1/community/pulse` - Get community signals

See `ARCHITECTURE.md` for detailed API documentation.

