# Gamified Trading Backend

FastAPI backend for the gamified trading application.

## Tech Stack

- **Python 3.11+**
- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **Supabase** - Auth & Database (Postgres)
- **Hyperliquid SDK** - Trading integration
- **Pear Protocol** - Pair/bucket trading
- **OpenAI** - AI chat assistant
- **ElevenLabs** - Text-to-speech

## Project Structure

```
backend/
├── app/
│   ├── main.py              # Application entry point
│   ├── core/                # Core utilities
│   │   ├── config.py        # Settings management
│   │   ├── security.py      # JWT validation
│   │   ├── logging.py       # Structured logging
│   │   └── middleware.py    # Request middleware
│   ├── db/                  # Database layer
│   │   ├── supabase.py      # Supabase client
│   │   └── repositories/    # Data access
│   ├── trade/               # Trading module
│   │   ├── router_*.py      # API endpoints
│   │   ├── schemas.py       # Pydantic models
│   │   └── services/        # Business logic
│   ├── community/           # Social features
│   ├── improve/             # Challenges module
│   └── ai/                  # AI assistant
├── sql/                     # Database migrations
├── tests/                   # Test suite
├── pyproject.toml           # Dependencies
└── .env.example             # Environment template
```

## Setup

### 1. Create virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -e ".[dev]"
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Run database migrations

Apply the SQL migrations in `sql/` to your Supabase project via the SQL Editor.

### 5. Start the server

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once running, access:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Routes

| Module | Route | Description |
|--------|-------|-------------|
| Health | `/health` | Health check |
| Trade | `/api/trade/hyperliquid/*` | Hyperliquid trading |
| Trade | `/api/trade/pear/*` | Pear Protocol trading |
| Trade | `/api/trade/instruments/*` | Available instruments |
| Community | `/api/community/users/*` | User profiles |
| Community | `/api/community/friends/*` | Friend system |
| Community | `/api/community/leagues/*` | Leagues & competitions |
| Community | `/api/community/tables/*` | Leaderboards |
| Improve | `/api/improve/challenges/*` | Learning challenges |
| AI | `/api/ai/chat` | GPT chat |
| AI | `/api/ai/voice` | Text-to-speech |
| AI | `/api/ai/ui-help` | UI assistance |

## Development

### Run tests

```bash
pytest
```

### Run with coverage

```bash
pytest --cov=app --cov-report=html
```

### Type checking

```bash
mypy app
```

### Linting

```bash
ruff check app
ruff format app
```

## Docker

```bash
# Build
docker build -t gamified-trading-backend .

# Run
docker run -p 8000:8000 --env-file .env gamified-trading-backend

# Or use docker-compose
docker-compose up -d
```

## License

Proprietary - All rights reserved.
