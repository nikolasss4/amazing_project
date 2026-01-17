"""Challenge repository for improve module operations."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel
from supabase import Client

from app.db.repositories.base import BaseRepository


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


class Challenge(BaseModel):
    """Challenge model."""

    id: str
    title: str
    description: str
    difficulty: ChallengeDifficulty
    tags: list[str]
    points: int
    is_active: bool


class UserChallenge(BaseModel):
    """User challenge progress model."""

    id: str
    user_id: str
    challenge_id: str
    status: ChallengeStatus
    progress_json: dict
    completed_at: datetime | None = None


class ChallengeRepository(BaseRepository[Challenge]):
    """Repository for challenge operations."""

    table_name = "challenges"
    model_class = Challenge

    def __init__(self, client: Client):
        super().__init__(client)

    async def get_active_challenges(
        self,
        difficulty: ChallengeDifficulty | None = None,
        tags: list[str] | None = None,
        limit: int = 50,
    ) -> list[Challenge]:
        """Get active challenges with optional filters."""
        query = self.table.select("*").eq("is_active", True)

        if difficulty:
            query = query.eq("difficulty", difficulty.value)

        if tags:
            # Filter by tags (contains any of the specified tags)
            query = query.overlaps("tags", tags)

        response = query.limit(limit).execute()
        return [Challenge(**item) for item in response.data]

    async def get_by_difficulty(
        self, difficulty: ChallengeDifficulty
    ) -> list[Challenge]:
        """Get challenges by difficulty level."""
        response = (
            self.table.select("*")
            .eq("difficulty", difficulty.value)
            .eq("is_active", True)
            .execute()
        )
        return [Challenge(**item) for item in response.data]


class UserChallengeRepository(BaseRepository[UserChallenge]):
    """Repository for user challenge progress operations."""

    table_name = "user_challenges"
    model_class = UserChallenge

    def __init__(self, client: Client):
        super().__init__(client)

    async def get_user_challenges(
        self,
        user_id: str,
        status: ChallengeStatus | None = None,
    ) -> list[UserChallenge]:
        """Get all challenges for a user with optional status filter."""
        query = self.table.select("*").eq("user_id", user_id)

        if status:
            query = query.eq("status", status.value)

        response = query.execute()
        return [UserChallenge(**item) for item in response.data]

    async def get_user_challenge(
        self, user_id: str, challenge_id: str
    ) -> UserChallenge | None:
        """Get a specific user challenge."""
        response = (
            self.table.select("*")
            .eq("user_id", user_id)
            .eq("challenge_id", challenge_id)
            .execute()
        )
        if response.data:
            return UserChallenge(**response.data[0])
        return None

    async def start_challenge(
        self, user_id: str, challenge_id: str
    ) -> UserChallenge:
        """Start a challenge for a user."""
        response = (
            self.table.insert({
                "user_id": user_id,
                "challenge_id": challenge_id,
                "status": ChallengeStatus.IN_PROGRESS.value,
                "progress_json": {},
            })
            .execute()
        )
        return UserChallenge(**response.data[0])

    async def update_progress(
        self,
        user_challenge_id: str,
        progress: dict,
        status: ChallengeStatus | None = None,
    ) -> UserChallenge | None:
        """Update challenge progress."""
        update_data: dict = {"progress_json": progress}

        if status:
            update_data["status"] = status.value
            if status == ChallengeStatus.COMPLETED:
                update_data["completed_at"] = datetime.utcnow().isoformat()

        response = (
            self.table.update(update_data)
            .eq("id", user_challenge_id)
            .execute()
        )
        if response.data:
            return UserChallenge(**response.data[0])
        return None

    async def complete_challenge(
        self, user_challenge_id: str
    ) -> UserChallenge | None:
        """Mark a challenge as completed."""
        return await self.update_progress(
            user_challenge_id,
            progress={},
            status=ChallengeStatus.COMPLETED,
        )

    async def get_completed_count(self, user_id: str) -> int:
        """Get count of completed challenges for a user."""
        response = (
            self.table.select("id", count="exact")
            .eq("user_id", user_id)
            .eq("status", ChallengeStatus.COMPLETED.value)
            .execute()
        )
        return response.count or 0
