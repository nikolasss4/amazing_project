"""Pydantic schemas for community module."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# ============================================================================
# User Profile Schemas
# ============================================================================


class ProfileResponse(BaseModel):
    """User profile response."""

    user_id: str
    username: str
    avatar_url: str | None = None
    created_at: datetime


class ProfileUpdateRequest(BaseModel):
    """Request to update profile."""

    username: str | None = Field(None, min_length=3, max_length=30)
    avatar_url: str | None = None


class ProfileSearchResponse(BaseModel):
    """Profile search results."""

    profiles: list[ProfileResponse]
    count: int


# ============================================================================
# Friends Schemas
# ============================================================================


class FriendStatus(str, Enum):
    """Friend request status."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    BLOCKED = "blocked"


class FriendRequestCreate(BaseModel):
    """Request to send a friend request."""

    addressee_id: str = Field(..., description="User ID to send request to")


class FriendResponse(BaseModel):
    """Friend relationship response."""

    id: str
    requester_id: str
    addressee_id: str
    status: FriendStatus
    created_at: datetime

    # Optionally populated profile info
    requester_profile: ProfileResponse | None = None
    addressee_profile: ProfileResponse | None = None


class FriendsListResponse(BaseModel):
    """List of friends response."""

    friends: list[FriendResponse]
    count: int


class PendingRequestsResponse(BaseModel):
    """Pending friend requests response."""

    incoming: list[FriendResponse]
    outgoing: list[FriendResponse]


# ============================================================================
# League Schemas
# ============================================================================


class LeagueCreateRequest(BaseModel):
    """Request to create a league."""

    name: str = Field(..., min_length=3, max_length=50)
    season_start: datetime
    season_end: datetime


class LeagueResponse(BaseModel):
    """League response."""

    id: str
    name: str
    owner_id: str
    season_start: datetime
    season_end: datetime
    member_count: int = 0


class LeagueMemberResponse(BaseModel):
    """League member response."""

    user_id: str
    joined_at: datetime
    profile: ProfileResponse | None = None


class LeagueScoreResponse(BaseModel):
    """League score entry response."""

    user_id: str
    score: float
    rank: int
    updated_at: datetime
    profile: ProfileResponse | None = None


class LeaderboardResponse(BaseModel):
    """League leaderboard response."""

    league_id: str
    entries: list[LeagueScoreResponse]
    total_members: int


class LeagueDetailResponse(BaseModel):
    """Detailed league response with members."""

    league: LeagueResponse
    members: list[LeagueMemberResponse]
    leaderboard: list[LeagueScoreResponse]


# ============================================================================
# Table (Leaderboard) Schemas
# ============================================================================


class TableConfig(BaseModel):
    """Table configuration."""

    sort_by: str = "score"
    sort_order: str = "desc"
    time_range: str | None = None  # "daily", "weekly", "monthly", "all_time"
    max_entries: int = 100


class TableCreateRequest(BaseModel):
    """Request to create a table."""

    name: str = Field(..., min_length=3, max_length=50)
    league_id: str | None = None
    config: TableConfig = Field(default_factory=TableConfig)


class TableResponse(BaseModel):
    """Table response."""

    id: str
    name: str
    league_id: str | None
    config: TableConfig


class TableEntryResponse(BaseModel):
    """Table entry response."""

    rank: int
    user_id: str
    score: float
    profile: ProfileResponse | None = None


class TableDetailResponse(BaseModel):
    """Detailed table with entries."""

    table: TableResponse
    entries: list[TableEntryResponse]
    total_entries: int
