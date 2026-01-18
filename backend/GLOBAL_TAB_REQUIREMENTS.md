# Global Tab Requirements (Community Page)

The Global tab in the Community page displays **narratives** (market stories/topics) based on news articles.

## To View Existing Narratives (No API Keys Required)

If you already have narratives in the database, the Global tab will work **without any API keys**. You can:

1. **Use seed data**:
   ```bash
   cd backend
   node seed-narratives.js
   ```
   This populates the database with sample narratives and articles.

2. **View narratives** from existing database data.

## To Fetch New Narratives (API Keys Required)

To get **fresh narratives** from real news sources, you need API keys for news ingestion:

### Required API Keys

| Key | Purpose | Required For | Get Key At |
|-----|---------|--------------|------------|
| `NEWSAPI_KEY` | Fetch news articles from NewsAPI.org | Macro/crypto news ingestion | https://newsapi.org/register (Free: 100 req/day) |
| `CRYPTOPANIC_TOKEN` | Fetch crypto-specific news | Crypto news ingestion | https://cryptopanic.com/developers/api/ (Free tier available) |
| `OPENAI_API_KEY` | Sentiment analysis of articles | Article sentiment classification | https://platform.openai.com/api-keys (Paid) |

### Configuration

Add to `backend/.env`:

```env
# Required for news ingestion
NEWSAPI_KEY=your_newsapi_key_here

# Optional: For crypto-specific news (recommended)
CRYPTOPANIC_TOKEN=your_cryptopanic_token_here
CRYPTOPANIC_BASE_URL=https://cryptopanic.com/api/developer/v2

# Required for sentiment analysis
OPENAI_API_KEY=sk-proj-your_openai_key_here
```

### Setup Steps

1. **Install dependencies** (if not done):
   ```bash
   cd backend
   npm install
   ```

2. **Apply database migrations**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Seed news sources** (required):
   ```bash
   node seed-news-sources.js
   ```
   This creates active news sources in the database (e.g., `cryptopanic`, `newsapi`).

4. **Ingest news articles** (requires API keys):
   ```bash
   # Ingest articles from news sources
   curl -X POST "http://localhost:3000/api/v1/news/ingest?limit=20" \
     -H "x-user-id: 11111111-1111-1111-1111-111111111111"
   ```

5. **Build narratives** from articles (requires OpenAI for sentiment):
   ```bash
   cd backend
   npm run build:narratives
   ```
   Or use the environment variable:
   ```bash
   NARRATIVE_TIME_WINDOW_HOURS=168 \
   NARRATIVE_MIN_ARTICLES=2 \
   NARRATIVE_MIN_SHARED_ENTITIES=1 \
   npm run build:narratives
   ```

### Minimum Setup (View Only)

To just **view the Global tab** with sample data:

```bash
# 1. Apply migrations
cd backend
npx prisma migrate deploy

# 2. Seed news sources
node seed-news-sources.js

# 3. Seed narratives (sample data)
node seed-narratives.js

# 4. Start backend
npm run dev
```

**No API keys needed** if you're only viewing existing/sample data!

### API Keys Summary

| Scenario | NEWSAPI_KEY | CRYPTOPANIC_TOKEN | OPENAI_API_KEY |
|---------|-------------|-------------------|----------------|
| View existing narratives | ❌ Not needed | ❌ Not needed | ❌ Not needed |
| Ingest news articles | ✅ Required | ⚠️ Optional (recommended) | ❌ Not needed |
| Build narratives (sentiment) | ❌ Not needed | ❌ Not needed | ✅ Required |

### How It Works

1. **News Ingestion** → Fetches articles from NewsAPI/CryptoPanic using API keys
2. **Entity Extraction** → Identifies tickers, entities in articles (no API key needed)
3. **Narrative Detection** → Groups articles into narratives (no API key needed)
4. **Sentiment Analysis** → Uses OpenAI to classify sentiment (requires OPENAI_API_KEY)
5. **Global Tab** → Displays narratives from database (no API keys needed to view)

### Troubleshooting

**Global tab shows "No active crypto narratives":**

1. Check if narratives exist:
   ```bash
   cd backend
   npx prisma studio
   # Check DetectedNarrative table
   ```

2. Check if news sources are active:
   ```bash
   cd backend
   node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.newsSource.findMany({where: {active: true}}).then(r => console.log(r)).finally(() => p.\$disconnect());"
   ```

3. If no narratives exist:
   - **Option A**: Run `node seed-narratives.js` for sample data
   - **Option B**: Ingest real news (requires API keys) and build narratives

**API keys not working:**

- Verify keys are set in `.env` file
- Check API key is valid (test with curl or provider's test endpoint)
- Check rate limits (NewsAPI free tier: 100 requests/day)
- Verify backend server restarted after adding keys to `.env`

