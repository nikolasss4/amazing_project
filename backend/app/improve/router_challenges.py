"""Challenges API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.exceptions import NotFoundError, ValidationError
from app.core.security import AuthenticatedUser
from app.db.repositories.challenges import (
    ChallengeRepository,
    ChallengeStatus as DbChallengeStatus,
    ChallengeDifficulty as DbChallengeDifficulty,
    UserChallengeRepository,
)
from app.db.supabase import SupabaseClient
from app.improve.schemas import (
    ChallengeDifficulty,
    ChallengeProgressResponse,
    ChallengeResponse,
    ChallengesListResponse,
    ChallengeStatus,
    StartChallengeRequest,
    UpdateProgressRequest,
    UserChallengeResponse,
    UserChallengesListResponse,
    UserStatsResponse,
)

router = APIRouter()


def get_challenge_repository(client: SupabaseClient) -> ChallengeRepository:
    """Get challenge repository instance."""
    return ChallengeRepository(client)


def get_user_challenge_repository(client: SupabaseClient) -> UserChallengeRepository:
    """Get user challenge repository instance."""
    return UserChallengeRepository(client)


ChallengeRepoDep = Annotated[ChallengeRepository, Depends(get_challenge_repository)]
UserChallengeRepoDep = Annotated[UserChallengeRepository, Depends(get_user_challenge_repository)]


# ============================================================================
# Challenge Endpoints
# ============================================================================


@router.get("", response_model=ChallengesListResponse)
async def list_challenges(
    repo: ChallengeRepoDep,
    difficulty: ChallengeDifficulty | None = Query(None),
    tags: list[str] | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
) -> ChallengesListResponse:
    """
    List all active challenges.

    Can filter by difficulty and tags.
    """
    db_difficulty = None
    if difficulty:
        db_difficulty = DbChallengeDifficulty(difficulty.value)

    challenges = await repo.get_active_challenges(
        difficulty=db_difficulty,
        tags=tags,
        limit=limit,
    )

    return ChallengesListResponse(
        challenges=[
            ChallengeResponse(
                id=c.id,
                title=c.title,
                description=c.description,
                difficulty=ChallengeDifficulty(c.difficulty.value),
                tags=c.tags,
                points=c.points,
                is_active=c.is_active,
            )
            for c in challenges
        ],
        count=len(challenges),
    )


@router.get("/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge(
    challenge_id: str,
    repo: ChallengeRepoDep,
) -> ChallengeResponse:
    """
    Get a specific challenge by ID.
    """
    challenge = await repo.get_by_id(challenge_id)
    if not challenge:
        raise NotFoundError("Challenge", challenge_id)

    return ChallengeResponse(
        id=challenge.id,
        title=challenge.title,
        description=challenge.description,
        difficulty=ChallengeDifficulty(challenge.difficulty.value),
        tags=challenge.tags,
        points=challenge.points,
        is_active=challenge.is_active,
    )


# ============================================================================
# User Challenge Endpoints
# ============================================================================


@router.get("/user/me", response_model=UserChallengesListResponse)
async def get_my_challenges(
    user: AuthenticatedUser,
    user_repo: UserChallengeRepoDep,
    status: ChallengeStatus | None = Query(None),
) -> UserChallengesListResponse:
    """
    Get all challenges for the current user.

    Can filter by status.
    """
    db_status = None
    if status:
        db_status = DbChallengeStatus(status.value)

    user_challenges = await user_repo.get_user_challenges(user.id, status=db_status)
    completed_count = await user_repo.get_completed_count(user.id)

    return UserChallengesListResponse(
        challenges=[
            UserChallengeResponse(
                id=uc.id,
                user_id=uc.user_id,
                challenge_id=uc.challenge_id,
                status=ChallengeStatus(uc.status.value),
                progress=uc.progress_json,
                completed_at=uc.completed_at,
            )
            for uc in user_challenges
        ],
        count=len(user_challenges),
        completed_count=completed_count,
    )


@router.post("/user/start", response_model=UserChallengeResponse, status_code=201)
async def start_challenge(
    request: StartChallengeRequest,
    user: AuthenticatedUser,
    challenge_repo: ChallengeRepoDep,
    user_repo: UserChallengeRepoDep,
) -> UserChallengeResponse:
    """
    Start a challenge.

    Creates a user challenge record in progress.
    """
    # Verify challenge exists
    challenge = await challenge_repo.get_by_id(request.challenge_id)
    if not challenge:
        raise NotFoundError("Challenge", request.challenge_id)

    if not challenge.is_active:
        raise ValidationError("Challenge is not active")

    # Check if already started
    existing = await user_repo.get_user_challenge(user.id, request.challenge_id)
    if existing:
        if existing.status == DbChallengeStatus.IN_PROGRESS:
            raise ValidationError("Challenge already in progress")
        if existing.status == DbChallengeStatus.COMPLETED:
            raise ValidationError("Challenge already completed")

    user_challenge = await user_repo.start_challenge(user.id, request.challenge_id)

    return UserChallengeResponse(
        id=user_challenge.id,
        user_id=user_challenge.user_id,
        challenge_id=user_challenge.challenge_id,
        status=ChallengeStatus(user_challenge.status.value),
        progress=user_challenge.progress_json,
        completed_at=user_challenge.completed_at,
        challenge=ChallengeResponse(
            id=challenge.id,
            title=challenge.title,
            description=challenge.description,
            difficulty=ChallengeDifficulty(challenge.difficulty.value),
            tags=challenge.tags,
            points=challenge.points,
            is_active=challenge.is_active,
        ),
    )


@router.put("/user/{user_challenge_id}/progress", response_model=ChallengeProgressResponse)
async def update_challenge_progress(
    user_challenge_id: str,
    request: UpdateProgressRequest,
    user: AuthenticatedUser,
    challenge_repo: ChallengeRepoDep,
    user_repo: UserChallengeRepoDep,
) -> ChallengeProgressResponse:
    """
    Update progress on a challenge.

    Can optionally mark as completed.
    """
    # Verify user challenge exists and belongs to user
    existing = await user_repo.get_by_id(user_challenge_id)
    if not existing:
        raise NotFoundError("User challenge", user_challenge_id)

    if existing.user_id != user.id:
        raise ValidationError("Cannot update another user's challenge")

    if existing.status == DbChallengeStatus.COMPLETED:
        raise ValidationError("Challenge already completed")

    # Update progress
    new_status = None
    points_earned = 0
    message = "Progress updated"

    if request.complete:
        new_status = DbChallengeStatus.COMPLETED
        # Get challenge points
        challenge = await challenge_repo.get_by_id(existing.challenge_id)
        if challenge:
            points_earned = challenge.points
        message = "Challenge completed! Great job!"

    updated = await user_repo.update_progress(
        user_challenge_id,
        progress=request.progress,
        status=new_status,
    )

    if not updated:
        raise NotFoundError("User challenge", user_challenge_id)

    return ChallengeProgressResponse(
        user_challenge=UserChallengeResponse(
            id=updated.id,
            user_id=updated.user_id,
            challenge_id=updated.challenge_id,
            status=ChallengeStatus(updated.status.value),
            progress=updated.progress_json,
            completed_at=updated.completed_at,
        ),
        points_earned=points_earned,
        message=message,
    )


@router.post("/user/{user_challenge_id}/complete", response_model=ChallengeProgressResponse)
async def complete_challenge(
    user_challenge_id: str,
    user: AuthenticatedUser,
    challenge_repo: ChallengeRepoDep,
    user_repo: UserChallengeRepoDep,
) -> ChallengeProgressResponse:
    """
    Mark a challenge as completed.
    """
    existing = await user_repo.get_by_id(user_challenge_id)
    if not existing:
        raise NotFoundError("User challenge", user_challenge_id)

    if existing.user_id != user.id:
        raise ValidationError("Cannot complete another user's challenge")

    if existing.status == DbChallengeStatus.COMPLETED:
        raise ValidationError("Challenge already completed")

    # Get challenge for points
    challenge = await challenge_repo.get_by_id(existing.challenge_id)
    points_earned = challenge.points if challenge else 0

    updated = await user_repo.complete_challenge(user_challenge_id)
    if not updated:
        raise NotFoundError("User challenge", user_challenge_id)

    return ChallengeProgressResponse(
        user_challenge=UserChallengeResponse(
            id=updated.id,
            user_id=updated.user_id,
            challenge_id=updated.challenge_id,
            status=ChallengeStatus(updated.status.value),
            progress=updated.progress_json,
            completed_at=updated.completed_at,
        ),
        points_earned=points_earned,
        message="Challenge completed! Great job!",
    )


@router.get("/user/stats", response_model=UserStatsResponse)
async def get_user_stats(
    user: AuthenticatedUser,
    user_repo: UserChallengeRepoDep,
) -> UserStatsResponse:
    """
    Get challenge statistics for the current user.
    """
    all_challenges = await user_repo.get_user_challenges(user.id)
    completed = await user_repo.get_completed_count(user.id)

    in_progress = sum(
        1 for c in all_challenges
        if c.status == DbChallengeStatus.IN_PROGRESS
    )

    # TODO: Calculate total points from completed challenges
    # TODO: Calculate streak and badges

    return UserStatsResponse(
        total_challenges=len(all_challenges),
        completed_challenges=completed,
        in_progress_challenges=in_progress,
        total_points=0,  # TODO: Calculate from completed challenges
        streak_days=0,   # TODO: Calculate streak
        badges=[],       # TODO: Calculate badges
    )
