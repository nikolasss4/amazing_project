# CryptoPanic Setup - Real Data Only

## ✅ What's Already Done

- ✅ Mock provider **DISABLED** (no more fake data)
- ✅ CryptoPanic provider **ACTIVE** in database
- ✅ CryptoPanic provider code implemented
- ✅ Seed script updated

## 🔧 Setup Steps (REQUIRED)

### 1. Set Environment Variables

Add these to your `backend/.env` file:

```bash
CRYPTOPANIC_TOKEN=your_cryptopanic_token_here
CRYPTOPANIC_BASE_URL=https://cryptopanic.com/api/developer/v2
```

**Important:** Restart your backend server after adding env vars!

### 2. Verify Configuration

Run the verification script:

```bash
cd backend
node verify-cryptopanic.js
```

Expected output:
- ✅ CRYPTOPANIC_TOKEN is set
- ✅ cryptopanic (crypto) ACTIVE
- ❌ mock (macro) DISABLED

### 3. Ingest Real Data

Run ingestion to fetch real crypto news:

```bash
# Using curl
curl -X POST http://localhost:3000/api/v1/news/ingest?limit=50 \
  -H "x-user-id: test" \
  -H "Content-Type: application/json"

# Or use your API client/Postman
POST /api/v1/news/ingest?limit=50
Header: x-user-id: test
```

### 4. (Optional) Clean Up Old Mock Data

If you have old mock articles, clean them up:

```bash
curl -X DELETE "http://localhost:3000/api/v1/news/cleanup?daysOld=1" \
  -H "x-user-id: test"
```

### 5. Build Narratives from Real Data

After ingestion, build narratives:

```bash
cd backend
npm run build:narratives
# Or: node src/run-build-narratives.ts
```

## ✅ Verification Checklist

After setup, verify:

1. **Database has CryptoPanic articles:**
   ```bash
   node verify-cryptopanic.js
   ```
   Should show: `📰 Recent CryptoPanic Articles: X` (where X > 0)

2. **Narratives are built from real data:**
   ```bash
   curl http://localhost:3000/api/narratives -H "x-user-id: test"
   ```
   Should return narratives with real titles from CryptoPanic

3. **Frontend shows real data:**
   - Open Community page
   - Market Narratives should show real crypto news stories
   - Crypto Market widget should show real tickers/events

## 🔍 Current Status

Run `node verify-cryptopanic.js` to check:
- Environment variables
- Source activation status
- Recent articles count
- Mock data warnings

## ❌ What's Disabled

- ❌ **Mock provider** - Set to `active: false`
- ❌ Mock data will NOT be ingested anymore

## ✅ Active Sources

- ✅ **CryptoPanic** (crypto) - Real crypto news API
- ✅ **NewsAPI** (macro) - Real general news (if NEWSAPI_KEY is set)

## 🚨 Troubleshooting

**No articles after ingestion?**
- Check env var is set: `echo $CRYPTOPANIC_TOKEN`
- Restart backend server
- Check backend logs for API errors
- Verify token is valid on CryptoPanic dashboard

**Still seeing mock data?**
- Clean up: `DELETE /api/v1/news/cleanup?daysOld=1`
- Verify mock is disabled: `node verify-cryptopanic.js`
- Rebuild narratives: `npm run build:narratives`

