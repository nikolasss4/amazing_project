# How to Enable Real Twitter/X Data

## 🔑 Current Status

**API Key:** Configured ✅  
**Subscription:** ❌ **NOT ACTIVE**  
**Provider:** MockXProvider (testing mode)

---

## ⚠️ Issue: API Subscription Required

When testing with your RapidAPI key, we got:

```
❌ Error: 403 - {"message":"You are not subscribed to this API."}
```

**What this means:**
- ✅ Your API key is **valid** (no 401 auth error)
- ❌ You need to **subscribe** to the Twitter API on RapidAPI

---

## 🚀 How to Subscribe & Enable Real Tweets

### Step 1: Subscribe to Twitter API on RapidAPI

1. **Go to:** https://rapidapi.com/belchiorarkad-FqvHs2EDOtP/api/twitter154
2. **Sign in** with your RapidAPI account
3. **Choose a plan:**
   - **Free Plan:** Usually 100-500 requests/month
   - **Basic Plan:** $10-20/month for more requests
   - **Pro Plan:** Higher limits for production
4. **Subscribe** to the plan
5. **Wait** for subscription to activate (usually instant)

### Step 2: Verify Subscription

Run the test again:

```bash
cd backend
npm run test:x-provider
```

**Expected output (when subscribed):**
```
✅ Provider available: true
📡 Fetching tweets from @elonmusk...
✅ Fetched 5 posts

Sample post:
─────────────────────────────────────────────────────────
Author: @elonmusk
Content: <REAL TWEET TEXT>
Published: <TIMESTAMP>
Engagement: <REAL NUMBERS> likes, <REAL NUMBERS> reposts
─────────────────────────────────────────────────────────
```

### Step 3: Enable Real Provider

**Edit:** `backend/src/jobs/x-ingestion.job.ts`

```typescript
// Line 41-42: Change this:
this.provider = provider || new MockXProvider();

// To this:
this.provider = provider || new RapidApiXProvider();
```

### Step 4: Run Real Ingestion

```bash
npm run ingest:x
```

**Expected output:**
```
🚀 Starting X ingestion job...
📋 Found 11 active X accounts
  ✅ @elonmusk: 20 fetched, 18 stored
  ✅ @michael_saylor: 15 fetched, 15 stored
  ✅ @VitalikButerin: 12 fetched, 10 stored
  ...

📊 Ingestion Summary:
  • Posts fetched: 150+
  • Posts stored: 140+
  • Duration: ~30s
```

### Step 5: Verify Real Tweets in Database

```bash
sqlite3 prisma/dev.db "SELECT authorHandle, substr(content, 1, 80), engagement FROM ExternalPost ORDER BY createdAt DESC LIMIT 5;"
```

**You should see real tweet content!**

### Step 6: Test Narrative Integration

```bash
npm run test:x-narratives
```

**Expected output:**
```
📖 Sample narratives (showing mixed sources)

  📰 $BTC Market Movement (bullish)
     Sources: 7 articles, 5 X posts ✅
     Sample X post: @michael_saylor: "<REAL TWEET>"

  📰 $TSLA Market Movement (bearish)
     Sources: 7 articles, 8 X posts ✅
     Sample X post: @elonmusk: "<REAL TWEET>"
```

---

## 🔄 Current Setup (Mock Provider)

While waiting for subscription, the system works with **realistic mock data**:

```bash
npm run ingest:x
# ✅ 11 posts ingested (mock data)

npm run test:x-narratives
# ✅ Posts flowing into narratives
```

**Mock posts include:**
- Realistic content ($TSLA, $BTC mentions)
- Engagement numbers (likes, reposts)
- Proper timestamps
- Correct authors (@elonmusk, @michael_saylor, etc.)

**This is perfect for:**
- ✅ Testing the pipeline
- ✅ Demonstrating features
- ✅ Development work

**But NOT real market data** (obviously)

---

## 🎯 Quick Reference

### Commands

```bash
# Test provider (checks API subscription)
npm run test:x-provider

# Run ingestion (mock or real, depending on provider)
npm run ingest:x

# Test end-to-end (narratives with X posts)
npm run test:x-narratives

# Check database
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM ExternalPost;"
```

### Files to Edit

**To switch providers:**
- `backend/src/jobs/x-ingestion.job.ts` (line 41)

**API configuration:**
- `backend/.env` (already configured with your key)

---

## 💰 RapidAPI Pricing (Typical)

**Twitter154 API (Example):**
- **Free:** 100 requests/month
- **Basic:** $10/month - 10,000 requests/month
- **Pro:** $50/month - 100,000 requests/month

**Your usage:**
- 11 tracked accounts
- 20 tweets per account per run
- ~220 requests per ingestion
- Run every 15 min = 96 runs/day = ~21,000 requests/day

**Recommendation:** Pro plan ($50/month) for production

---

## 🔍 Troubleshooting

### Issue: "You are not subscribed to this API"
**Solution:** Subscribe to the Twitter API on RapidAPI

### Issue: "Rate limit exceeded"
**Solution:** 
- Reduce `postsPerHandle` in ingestion config
- Increase `delayBetweenHandles`
- Upgrade to higher tier plan

### Issue: "Invalid API key"
**Solution:** Check `.env` file has correct `X_PROVIDER_KEY`

### Issue: "404 - Page not found"
**Solution:** Check `X_PROVIDER_BASE_URL` matches your RapidAPI endpoint

---

## ✅ Summary

**Current State:**
- ✅ API key configured
- ✅ RapidApiXProvider implemented
- ✅ MockXProvider working for testing
- ❌ Subscription not active

**Next Steps:**
1. Subscribe to Twitter API on RapidAPI
2. Test: `npm run test:x-provider`
3. Switch provider in `x-ingestion.job.ts`
4. Run: `npm run ingest:x`
5. **Real tweets flow into narratives!** 🚀

**Everything works with mock data right now.**  
**Ready to switch to real data once subscribed!**

---

**Documentation:**
- Full integration guide: `X_INTEGRATION_COMPLETE.md`
- This guide: `RAPIDAPI_SUBSCRIPTION_GUIDE.md`

**Date:** January 17, 2026  
**Status:** Ready for RapidAPI subscription

