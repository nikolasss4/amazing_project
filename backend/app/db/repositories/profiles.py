"""Profile repository for user profile operations."""

from datetime import datetime

from pydantic import BaseModel
from supabase import Client

from app.db.repositories.base import BaseRepository


class Profile(BaseModel):
    """User profile model."""

    user_id: str
    username: str
    avatar_url: str | None = None
    created_at: datetime


class ProfileRepository(BaseRepository[Profile]):
    """Repository for profile operations."""

    table_name = "profiles"
    model_class = Profile

    def __init__(self, client: Client):
        super().__init__(client)

    async def get_by_user_id(self, user_id: str) -> Profile | None:
        """Get profile by user ID."""
        response = self.table.select("*").eq("user_id", user_id).single().execute()
        if response.data:
            return Profile(**response.data)
        return None

    async def get_by_username(self, username: str) -> Profile | None:
        """Get profile by username."""
        response = self.table.select("*").eq("username", username).single().execute()
        if response.data:
            return Profile(**response.data)
        return None

    async def search_by_username(self, query: str, limit: int = 20) -> list[Profile]:
        """Search profiles by username prefix."""
        response = (
            self.table.select("*")
            .ilike("username", f"{query}%")
            .limit(limit)
            .execute()
        )
        return [Profile(**item) for item in response.data]

    async def update_avatar(self, user_id: str, avatar_url: str) -> Profile | None:
        """Update user avatar URL."""
        response = (
            self.table.update({"avatar_url": avatar_url})
            .eq("user_id", user_id)
            .execute()
        )
        if response.data:
            return Profile(**response.data[0])
        return None
