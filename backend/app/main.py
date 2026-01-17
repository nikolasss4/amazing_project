"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import get_logger, setup_logging
from app.core.middleware import RequestIDMiddleware

# Import routers
from app.trade.router_hyperliquid import router as hyperliquid_router
from app.trade.router_pear import router as pear_router
from app.trade.router_instruments import router as instruments_router
from app.community.router_users import router as users_router
from app.community.router_friends import router as friends_router
from app.community.router_leagues import router as leagues_router
from app.community.router_tables import router as tables_router
from app.improve.router_challenges import router as challenges_router
from app.ai.router import router as ai_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # Startup
    setup_logging()
    logger.info("Starting application", app_name=settings.APP_NAME, env=settings.APP_ENV)
    yield
    # Shutdown
    logger.info("Shutting down application")


app = FastAPI(
    title=settings.APP_NAME,
    description="Gamified Trading Application API",
    version="0.1.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Middleware
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle uncaught exceptions."""
    logger.error(
        "Unhandled exception",
        exc_info=exc,
        path=request.url.path,
        method=request.method,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred",
        },
    )


# Health check
@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "app": settings.APP_NAME}


# Include routers
app.include_router(hyperliquid_router, prefix="/api/trade/hyperliquid", tags=["Hyperliquid"])
app.include_router(pear_router, prefix="/api/trade/pear", tags=["Pear Protocol"])
app.include_router(instruments_router, prefix="/api/trade/instruments", tags=["Instruments"])
app.include_router(users_router, prefix="/api/community/users", tags=["Users"])
app.include_router(friends_router, prefix="/api/community/friends", tags=["Friends"])
app.include_router(leagues_router, prefix="/api/community/leagues", tags=["Leagues"])
app.include_router(tables_router, prefix="/api/community/tables", tags=["Tables"])
app.include_router(challenges_router, prefix="/api/improve/challenges", tags=["Challenges"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI Assistant"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
