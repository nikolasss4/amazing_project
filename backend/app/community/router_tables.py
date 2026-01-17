"""Tables (leaderboards) API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.exceptions import NotFoundError
from app.core.security import AuthenticatedUser
from app.community.schemas import (
    TableConfig,
    TableCreateRequest,
    TableDetailResponse,
    TableEntryResponse,
    TableResponse,
)
from app.db.repositories.leagues import Table, TableRepository
from app.db.supabase import SupabaseClient

router = APIRouter()


def get_table_repository(client: SupabaseClient) -> TableRepository:
    """Get table repository instance."""
    return TableRepository(client)


TableRepoDep = Annotated[TableRepository, Depends(get_table_repository)]


@router.post("", response_model=TableResponse, status_code=201)
async def create_table(
    request: TableCreateRequest,
    user: AuthenticatedUser,
    repo: TableRepoDep,
) -> TableResponse:
    """
    Create a new leaderboard table.

    Tables can be global or tied to a specific league.
    """
    table_data = {
        "name": request.name,
        "league_id": request.league_id,
        "config_json": request.config.model_dump(),
    }

    table = await repo.create(table_data)
    return TableResponse(
        id=table.id,
        name=table.name,
        league_id=table.league_id,
        config=TableConfig(**table.config_json),
    )


@router.get("", response_model=list[TableResponse])
async def list_tables(
    repo: TableRepoDep,
    league_id: str | None = Query(None, description="Filter by league"),
    global_only: bool = Query(False, description="Only return global tables"),
) -> list[TableResponse]:
    """
    List all tables.

    Can filter by league or get only global tables.
    """
    if global_only:
        tables = await repo.get_global_tables()
    elif league_id:
        tables = await repo.get_by_league(league_id)
    else:
        # Get all tables (would need pagination in production)
        tables = await repo.get_all(limit=100)

    return [
        TableResponse(
            id=t.id,
            name=t.name,
            league_id=t.league_id,
            config=TableConfig(**t.config_json),
        )
        for t in tables
    ]


@router.get("/{table_id}", response_model=TableDetailResponse)
async def get_table_detail(
    table_id: str,
    repo: TableRepoDep,
    limit: int = Query(100, ge=1, le=500),
) -> TableDetailResponse:
    """
    Get detailed table information with entries.

    Returns the table configuration and ranked entries.
    """
    table = await repo.get_by_id(table_id)
    if not table:
        raise NotFoundError("Table", table_id)

    # TODO: Implement actual score fetching based on table config
    # This would aggregate scores from trades, challenges, etc.
    # For now, return empty entries

    return TableDetailResponse(
        table=TableResponse(
            id=table.id,
            name=table.name,
            league_id=table.league_id,
            config=TableConfig(**table.config_json),
        ),
        entries=[],  # TODO: Populate with actual scores
        total_entries=0,
    )


@router.delete("/{table_id}")
async def delete_table(
    table_id: str,
    user: AuthenticatedUser,
    repo: TableRepoDep,
) -> dict[str, bool]:
    """
    Delete a table.

    TODO: Add authorization check (only owner/admin can delete).
    """
    table = await repo.get_by_id(table_id)
    if not table:
        raise NotFoundError("Table", table_id)

    # TODO: Verify user has permission to delete

    success = await repo.delete(table_id)
    return {"success": success}
