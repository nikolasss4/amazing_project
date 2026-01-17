"""Supabase client initialization and utilities."""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from supabase import Client, create_client

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@lru_cache
def get_supabase_client() -> Client:
    """
    Get Supabase client with anon key.

    This client respects Row Level Security (RLS) policies.
    Use for user-facing operations.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.warning("Supabase credentials not configured")

    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_KEY,
    )


@lru_cache
def get_supabase_admin_client() -> Client:
    """
    Get Supabase client with service role key.

    This client bypasses RLS. Use only for admin operations.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        logger.warning("Supabase admin credentials not configured")

    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY,
    )


# Type aliases for dependency injection
SupabaseClient = Annotated[Client, Depends(get_supabase_client)]
SupabaseAdminClient = Annotated[Client, Depends(get_supabase_admin_client)]
