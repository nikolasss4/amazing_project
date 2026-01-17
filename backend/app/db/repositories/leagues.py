"""League repository for competition and leaderboard operations."""

from datetime import datetime

from pydantic import BaseModel
from supabase import Client

from app.db.repositories.base import BaseRepository


class League(BaseModel):
    """League model."""

    id: str
    name: str
    owner_id: str
    season_start: datetime
    season_end: datetime


class LeagueMember(BaseModel):
    """League member model."""

    league_id: str
    user_id: str
    joined_at: datetime


class LeagueScore(BaseModel):
    """League score model."""

    league_id: str
    user_id: str
    score: float
    updated_at: datetime


class Table(BaseModel):
    """Leaderboard table model."""

    id: str
    league_id: str | None
    name: str
    config_json: dict


class LeagueRepository(BaseRepository[League]):
    """Repository for league operations."""

    table_name = "leagues"
    model_class = League

    def __init__(self, client: Client):
        super().__init__(client)

    async def get_user_leagues(self, user_id: str) -> list[League]:
        """Get all leagues a user is a member of."""
        # First get league IDs from league_members
        members_response = (
            self.client.table("league_members")
            .select("league_id")
            .eq("user_id", user_id)
            .execute()
        )
        league_ids = [m["league_id"] for m in members_response.data]

        if not league_ids:
            return []

        # Then get league details
        response = self.table.select("*").in_("id", league_ids).execute()
        return [League(**item) for item in response.data]

    async def get_members(self, league_id: str) -> list[LeagueMember]:
        """Get all members of a league."""
        response = (
            self.client.table("league_members")
            .select("*")
            .eq("league_id", league_id)
            .execute()
        )
        return [LeagueMember(**item) for item in response.data]

    async def add_member(self, league_id: str, user_id: str) -> LeagueMember:
        """Add a user to a league."""
        response = (
            self.client.table("league_members")
            .insert({"league_id": league_id, "user_id": user_id})
            .execute()
        )
        return LeagueMember(**response.data[0])

    async def remove_member(self, league_id: str, user_id: str) -> bool:
        """Remove a user from a league."""
        response = (
            self.client.table("league_members")
            .delete()
            .eq("league_id", league_id)
            .eq("user_id", user_id)
            .execute()
        )
        return len(response.data) > 0

    async def get_leaderboard(
        self, league_id: str, limit: int = 100
    ) -> list[LeagueScore]:
        """Get league leaderboard sorted by score."""
        response = (
            self.client.table("league_scores")
            .select("*")
            .eq("league_id", league_id)
            .order("score", desc=True)
            .limit(limit)
            .execute()
        )
        return [LeagueScore(**item) for item in response.data]

    async def update_score(
        self, league_id: str, user_id: str, score: float
    ) -> LeagueScore:
        """Update a user's score in a league."""
        response = (
            self.client.table("league_scores")
            .upsert({
                "league_id": league_id,
                "user_id": user_id,
                "score": score,
                "updated_at": datetime.utcnow().isoformat(),
            })
            .execute()
        )
        return LeagueScore(**response.data[0])


class TableRepository(BaseRepository[Table]):
    """Repository for leaderboard table operations."""

    table_name = "tables"
    model_class = Table

    def __init__(self, client: Client):
        super().__init__(client)

    async def get_by_league(self, league_id: str) -> list[Table]:
        """Get all tables for a league."""
        response = (
            self.table.select("*")
            .eq("league_id", league_id)
            .execute()
        )
        return [Table(**item) for item in response.data]

    async def get_global_tables(self) -> list[Table]:
        """Get all global tables (not tied to a league)."""
        response = (
            self.table.select("*")
            .is_("league_id", "null")
            .execute()
        )
        return [Table(**item) for item in response.data]
