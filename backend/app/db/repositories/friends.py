"""Friend repository for friend request and relationship operations."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel
from supabase import Client

from app.db.repositories.base import BaseRepository


class FriendStatus(str, Enum):
    """Friend request status."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    BLOCKED = "blocked"


class Friend(BaseModel):
    """Friend relationship model."""

    id: str
    requester_id: str
    addressee_id: str
    status: FriendStatus
    created_at: datetime


class FriendRepository(BaseRepository[Friend]):
    """Repository for friend operations."""

    table_name = "friends"
    model_class = Friend

    def __init__(self, client: Client):
        super().__init__(client)

    async def get_friends(self, user_id: str) -> list[Friend]:
        """Get all accepted friends for a user."""
        # Friends where user is requester or addressee
        response = (
            self.table.select("*")
            .eq("status", FriendStatus.ACCEPTED.value)
            .or_(f"requester_id.eq.{user_id},addressee_id.eq.{user_id}")
            .execute()
        )
        return [Friend(**item) for item in response.data]

    async def get_pending_requests(self, user_id: str) -> list[Friend]:
        """Get pending friend requests for a user (where they are addressee)."""
        response = (
            self.table.select("*")
            .eq("addressee_id", user_id)
            .eq("status", FriendStatus.PENDING.value)
            .execute()
        )
        return [Friend(**item) for item in response.data]

    async def get_sent_requests(self, user_id: str) -> list[Friend]:
        """Get sent friend requests by a user."""
        response = (
            self.table.select("*")
            .eq("requester_id", user_id)
            .eq("status", FriendStatus.PENDING.value)
            .execute()
        )
        return [Friend(**item) for item in response.data]

    async def get_relationship(
        self, user_id_1: str, user_id_2: str
    ) -> Friend | None:
        """Get the relationship between two users."""
        response = (
            self.table.select("*")
            .or_(
                f"and(requester_id.eq.{user_id_1},addressee_id.eq.{user_id_2}),"
                f"and(requester_id.eq.{user_id_2},addressee_id.eq.{user_id_1})"
            )
            .execute()
        )
        if response.data:
            return Friend(**response.data[0])
        return None

    async def send_request(self, requester_id: str, addressee_id: str) -> Friend:
        """Send a friend request."""
        response = (
            self.table.insert({
                "requester_id": requester_id,
                "addressee_id": addressee_id,
                "status": FriendStatus.PENDING.value,
            })
            .execute()
        )
        return Friend(**response.data[0])

    async def accept_request(self, request_id: str) -> Friend | None:
        """Accept a friend request."""
        response = (
            self.table.update({"status": FriendStatus.ACCEPTED.value})
            .eq("id", request_id)
            .execute()
        )
        if response.data:
            return Friend(**response.data[0])
        return None

    async def reject_request(self, request_id: str) -> Friend | None:
        """Reject a friend request."""
        response = (
            self.table.update({"status": FriendStatus.REJECTED.value})
            .eq("id", request_id)
            .execute()
        )
        if response.data:
            return Friend(**response.data[0])
        return None
