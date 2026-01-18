# Complete API Keys & Environment Variables Guide

This document lists **all** required and optional API keys and environment variables for the application.

---

## 🔑 Required API Keys

### 1. NewsAPI - `NEWSAPI_KEY`
**Status:** ✅ **REQUIRED**  
**Purpose:** Fetch real news articles for market narratives  
**Get Key:** https://newsapi.org/register  
**Free Tier:** 100 requests/day  
**Usage:** Community page news ingestion

```bash
NEWSAPI_KEY=your_newsapi_key_here
```

**Verification:**
```bash
curl -X POST "http://localhost:3000/api/v1/news/ingest?limit=20" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111"
```

---

### 2. OpenAI - `OPENAI_API_KEY`
**Status:** ✅ **REQUIRED**  
**Purpose:** Sentiment analysis, AI chat assistant, Whisper STT, GPT-4 Vision  
**Get Key:** https://platform.openai.com/api-keys  
**Usage:** 
- Sentiment analysis for news articles
- Voice query processing
- AI chat features

```bash
OPENAI_API_KEY=sk-proj-...
```

**Alternative:** You can use Google Gemini instead:
```bash
GOOGLE_GEMINI_API_KEY=your_gemini_key_here
USE_GEMINI=true
```

---

## ⚠️ Optional API Keys

### 3. CryptoPanic - `CRYPTOPANIC_TOKEN`
**Status:** ⚠️ **OPTIONAL**  
**Purpose:** Fetch crypto-specific news  
**Get Key:** https://cryptopanic.com/developers/api/  
**Usage:** Additional crypto news source for narratives

```bash
CRYPTOPANIC_TOKEN=your_cryptopanic_token_here
CRYPTOPANIC_BASE_URL=https://cryptopanic.com/api/developer/v2
```

**Verification:**
```bash
cd backend
node verify-cryptopanic.js
```

---

### 4. ElevenLabs - `ELEVENLABS_API_KEY` & `ELEVENLABS_VOICE_ID`
**Status:** ⚠️ **OPTIONAL**  
**Purpose:** Text-to-speech for voice features  
**Get Key:** https://elevenlabs.io/  
**Usage:** Voice query responses

```bash
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=xYWUvKNK6zWCgsdAK7Wi  # Default voice
```

---

### 5. X/Twitter Provider - `X_PROVIDER_KEY` & `X_PROVIDER_BASE_URL`
**Status:** ⚠️ **OPTIONAL**  
**Purpose:** Fetch X/Twitter posts for social narratives  
**Get Key:** Via RapidAPI or third-party provider  
**Usage:** Social media post ingestion

```bash
# For RapidAPI
X_PROVIDER_HOST=twitter154.p.rapidapi.com
X_PROVIDER_BASE_URL=https://twitter154.p.rapidapi.com
X_PROVIDER_KEY=your_rapidapi_key_here

# For Third-party provider
X_PROVIDER_BASE_URL=https://your-provider.com/api
X_PROVIDER_KEY=your_provider_key_here
```

---

## 🗄️ Database & Infrastructure

### 6. Database - `DATABASE_URL`
**Status:** ✅ **REQUIRED**  
**Purpose:** PostgreSQL database connection  
**Format:** `postgresql://user:password@host:port/database?schema=public`

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/risklaba?schema=public"
```

**For SQLite (development):**
```bash
DATABASE_URL="file:./dev.db"
```

---

### 7. Redis - `REDIS_URL`
**Status:** ✅ **REQUIRED**  
**Purpose:** Job queue and caching  
**Format:** `redis://host:port` or `redis://localhost:6379`

```bash
REDIS_URL="redis://localhost:6379"
```

---

### 8. JWT Secret - `JWT_SECRET`
**Status:** ✅ **REQUIRED**  
**Purpose:** JWT token signing for authentication  
**Security:** Use a strong random string in production

```bash
JWT_SECRET="your-secret-key-here-change-in-production"
```

---

## 🔐 Supabase (If Using Supabase)

### 9. Supabase Configuration
**Status:** ⚠️ **OPTIONAL** (Required if using Supabase for auth/database)  
**Purpose:** Supabase authentication and database

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
```

---

## 💱 Trading Integration (Optional)

### 10. Hyperliquid - `HYPERLIQUID_PRIVATE_KEY` & `HYPERLIQUID_WALLET_ADDRESS`
**Status:** ⚠️ **OPTIONAL**  
**Purpose:** Hyperliquid trading integration  
**Get Key:** From your Hyperliquid wallet

```bash
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_PRIVATE_KEY=your_private_key
HYPERLIQUID_WALLET_ADDRESS=your_wallet_address
```

---

### 11. Pear Protocol - `PEAR_API_KEY`
**Status:** ⚠️ **OPTIONAL**  
**Purpose:** Pear Protocol trading integration  
**Note:** Authentication uses wallet signatures, API key may not be required

```bash
PEAR_API_URL=https://hl-v2.pearprotocol.io
PEAR_API_KEY=your_pear_api_key  # May be optional
```

---

## ⚙️ Application Configuration

### 12. Server Configuration
**Status:** ⚠️ **OPTIONAL** (Has defaults)

```bash
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000
```

---

### 13. Narrative Building Configuration
**Status:** ⚠️ **OPTIONAL** (Has defaults)

```bash
NARRATIVE_TIME_WINDOW_HOURS=24
NARRATIVE_MIN_ARTICLES=3
NARRATIVE_MIN_SHARED_ENTITIES=2
```

---

## 📋 Complete `.env` Template

Create a `.env` file in the `backend/` directory with all your keys:

```bash
# ============================================================================
# REQUIRED - Core Infrastructure
# ============================================================================
DATABASE_URL="postgresql://user:password@localhost:5432/risklaba?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key-here-change-in-production"
PORT=3000
NODE_ENV=development

# ============================================================================
# REQUIRED - News & AI Services
# ============================================================================
NEWSAPI_KEY=your_newsapi_key_here
OPENAI_API_KEY=sk-proj-...

# ============================================================================
# OPTIONAL - Additional News Sources
# ============================================================================
CRYPTOPANIC_TOKEN=your_cryptopanic_token_here
CRYPTOPANIC_BASE_URL=https://cryptopanic.com/api/developer/v2

# ============================================================================
# OPTIONAL - AI Alternatives
# ============================================================================
GOOGLE_GEMINI_API_KEY=your_gemini_key_here
USE_GEMINI=false  # Set to 'true' to use Gemini instead of OpenAI

# ============================================================================
# OPTIONAL - Voice Features
# ============================================================================
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=xYWUvKNK6zWCgsdAK7Wi

# ============================================================================
# OPTIONAL - Social Media Integration
# ============================================================================
X_PROVIDER_HOST=twitter154.p.rapidapi.com
X_PROVIDER_BASE_URL=https://twitter154.p.rapidapi.com
X_PROVIDER_KEY=your_rapidapi_key_here

# ============================================================================
# OPTIONAL - Supabase (if using)
# ============================================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# ============================================================================
# OPTIONAL - Trading Integration
# ============================================================================
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_PRIVATE_KEY=your_private_key
HYPERLIQUID_WALLET_ADDRESS=your_wallet_address

PEAR_API_URL=https://hl-v2.pearprotocol.io
PEAR_API_KEY=your_pear_api_key

# ============================================================================
# OPTIONAL - Narrative Configuration
# ============================================================================
NARRATIVE_TIME_WINDOW_HOURS=24
NARRATIVE_MIN_ARTICLES=3
NARRATIVE_MIN_SHARED_ENTITIES=2
```

---

## ✅ Quick Setup Checklist

- [ ] **NEWSAPI_KEY** - Get from https://newsapi.org/register
- [ ] **OPENAI_API_KEY** - Get from https://platform.openai.com/api-keys
- [ ] **DATABASE_URL** - Configure PostgreSQL connection
- [ ] **REDIS_URL** - Configure Redis connection
- [ ] **JWT_SECRET** - Generate a secure random string
- [ ] **CRYPTOPANIC_TOKEN** (Optional) - Get from https://cryptopanic.com/developers/api/
- [ ] **ELEVENLABS_API_KEY** (Optional) - Get from https://elevenlabs.io/
- [ ] **X_PROVIDER_KEY** (Optional) - Get from RapidAPI or third-party provider

---

## 🔍 Verification Commands

### Test NewsAPI
```bash
curl -X POST "http://localhost:3000/api/v1/news/ingest?limit=20" \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111"
```

### Test CryptoPanic
```bash
cd backend
node verify-cryptopanic.js
```

### Test Database Connection
```bash
cd backend
npm run db:studio  # Opens Prisma Studio
```

### Test Redis Connection
```bash
redis-cli ping  # Should return "PONG"
```

---

## 📚 Additional Resources

- **NewsAPI Setup:** See `NEWSAPI_QUICKSTART.md`
- **CryptoPanic Setup:** See `CRYPTOPANIC_SETUP.md`
- **Pear Protocol Auth:** See `PEAR_AUTH_EXPLAINED.md`
- **Community Page Setup:** See root `README.md`

---

## 🆘 Troubleshooting

### "NEWSAPI_KEY is missing"
- Add `NEWSAPI_KEY` to your `.env` file
- Restart the backend server

### "CRYPTOPANIC_TOKEN is missing"
- This is optional - the app will work without it
- Add it if you want crypto news sources

### "OPENAI_API_KEY is missing"
- Required for sentiment analysis
- Get key from https://platform.openai.com/api-keys
- Or use `GOOGLE_GEMINI_API_KEY` with `USE_GEMINI=true`

### Database connection errors
- Check `DATABASE_URL` format
- Ensure PostgreSQL is running
- Verify credentials are correct

---

**Last Updated:** 2026-01-18  
**Status:** ✅ Complete - All API keys documented
