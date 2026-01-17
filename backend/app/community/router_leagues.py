"""Leagues API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.exceptions import NotFoundError
from app.core.security import AuthenticatedUser
from app.community.schemas import (
    LeaderboardResponse,
    LeagueCreateRequest,
    LeagueDetailResponse,
    LeagueMemberResponse,
    LeagueResponse,
    LeagueScoreResponse,
)
from app.db.repositories.leagues import League, LeagueRepository
from app.db.supabase import SupabaseClient

router = APIRouter()


def get_league_repository(client: SupabaseClient) -> LeagueRepository:
    """Get league repository instance."""
    return LeagueRepository(client)


LeagueRepoDep = Annotated[LeagueRepository, Depends(get_league_repository)]


@router.post("", response_model=LeagueResponse, status_code=status.HTTP_201_CREATED)
async def create_league(
    request: LeagueCreateRequest,
    user: AuthenticatedUser,
    repo: LeagueRepoDep,
) -> LeagueResponse:
    """
    Create a new league.

    The creating user becomes the league owner.
    """
    if request.season_end <= request.season_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Season end must be after season start",
        )

    league_data = {
        "name": request.name,
        "owner_id": user.id,
        "season_start": request.season_start.isoformat(),
        "season_end": request.season_end.isoformat(),
    }

    league = await repo.create(league_data)

    # Auto-join the creator to the league
    await repo.add_member(league.id, user.id)

    return LeagueResponse(**league.model_dump(), member_count=1)


@router.get("", response_model=list[LeagueResponse])
async def get_my_leagues(
    user: AuthenticatedUser,
    repo: LeagueRepoDep,
) -> list[LeagueResponse]:
    """
    Get all leagues the user is a member of.

    Returns leagues with member counts.
    """
    leagues = await repo.get_user_leagues(user.id)
    result = []
    for league in leagues:
        members = await repo.get_members(league.id)
        result.append(LeagueResponse(**league.model_dump(), member_count=len(members)))
    return result


@router.get("/{league_id}", response_model=LeagueDetailResponse)
async def get_league_detail(
    league_id: str,
    user: AuthenticatedUser,
    repo: LeagueRepoDep,
) -> LeagueDetailResponse:
    """
    Get detailed league information.

    Returns league info, members, and leaderboard.
    """
    league = await repo.get_by_id(league_id)
    if not league:
        raise NotFoundError("League", league_id)

    members = await repo.get_members(league_id)
    leaderboard = await repo.get_leaderboard(league_id)

    return LeagueDetailResponse(
        league=LeagueResponse(**league.model_dump(), member_count=len(members)),
        members=[
            LeagueMemberResponse(user_id=m.user_id, joined_at=m.joined_at)
            for m in members
        ],
        leaderboard=[
            LeagueScoreResponse(
                user_id=s.user_id,
                score=s.score,
                rank=i + 1,
                updated_at=s.updated_at,
            )
            for i, s in enumerate(leaderboard)
        ],
    )


@router.post("/{league_id}/join")
async def join_league(
    league_id: str,
    user: AuthenticatedUser,
    repo: LeagueRepoDep,
) -> dict[str, bool]:
    """
    Join a league.

    User becomes a member of the league.
    """
    league = await repo.get_by_id(league_id)
    if not league:
        raise NotFoundError("League", league_id)

    # Check if already a member
    members = await repo.get_members(league_id)
    if any(m.user_id == user.id for m in members):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a member of this league",
        )

    await repo.add_member(league_id, user.id)
    return {"success": True}


@router.post("/{league_id}/leave")
async def leave_league(
    league_id: str,
    user: AuthenticatedUser,
    repo: LeagueRepoDep,
) -> dict[str, bool]:
    """
    Leave a league.

    Owners cannot leave their own leagues.
    """
    league = await repo.get_by_id(league_id)
    if not league:
        raise NotFoundError("League", league_id)

    if league.owner_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="League owner cannot leave. Transfer ownership first.",
        )

    success = await repo.remove_member(league_id, user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not a member of this league",
        )
    return {"success": True}


@router.get("/{league_id}/leaderboard", response_model=LeaderboardResponse)
async def get_league_leaderboard(
    league_id: str,
    repo: LeagueRepoDep,
    limit: int = Query(100, ge=1, le=500),
) -> LeaderboardResponse:
    """
    Get the league leaderboard.

    Returns ranked scores for all members.
    """
    league = await repo.get_by_id(league_id)
    if not league:
        raise NotFoundError("League", league_id)

    leaderboard = await repo.get_leaderboard(league_id, limit=limit)
    members = await repo.get_members(league_id)

    return LeaderboardResponse(
        league_id=league_id,
        entries=[
            LeagueScoreResponse(
                user_id=s.user_id,
                score=s.score,
                rank=i + 1,
                updated_at=s.updated_at,
            )
            for i, s in enumerate(leaderboard)
        ],
        total_members=len(members),
    )
