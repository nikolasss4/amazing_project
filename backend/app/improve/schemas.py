"""Pydantic schemas for improve module."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ChallengeDifficulty(str, Enum):
    """Challenge difficulty levels."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class ChallengeStatus(str, Enum):
    """User challenge status."""

    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


# ============================================================================
# Challenge Schemas
# ============================================================================


class ChallengeResponse(BaseModel):
    """Challenge response."""

    id: str
    title: str
    description: str
    difficulty: ChallengeDifficulty
    tags: list[str]
    points: int
    is_active: bool


class ChallengesListResponse(BaseModel):
    """List of challenges response."""

    challenges: list[ChallengeResponse]
    count: int


class ChallengeFilterParams(BaseModel):
    """Parameters for filtering challenges."""

    difficulty: ChallengeDifficulty | None = None
    tags: list[str] | None = None
    limit: int = Field(50, ge=1, le=100)


# ============================================================================
# User Challenge Schemas
# ============================================================================


class UserChallengeResponse(BaseModel):
    """User challenge progress response."""

    id: str
    user_id: str
    challenge_id: str
    status: ChallengeStatus
    progress: dict[str, Any]
    completed_at: datetime | None = None

    # Optionally populated challenge info
    challenge: ChallengeResponse | None = None


class UserChallengesListResponse(BaseModel):
    """List of user challenges response."""

    challenges: list[UserChallengeResponse]
    count: int
    completed_count: int


class StartChallengeRequest(BaseModel):
    """Request to start a challenge."""

    challenge_id: str


class UpdateProgressRequest(BaseModel):
    """Request to update challenge progress."""

    progress: dict[str, Any] = Field(
        ...,
        description="Progress data specific to the challenge type",
    )
    complete: bool = Field(
        False,
        description="Mark challenge as completed",
    )


class ChallengeProgressResponse(BaseModel):
    """Response after updating challenge progress."""

    user_challenge: UserChallengeResponse
    points_earned: int = 0
    message: str


class UserStatsResponse(BaseModel):
    """User challenge statistics."""

    total_challenges: int
    completed_challenges: int
    in_progress_challenges: int
    total_points: int
    streak_days: int = 0
    badges: list[str] = []
