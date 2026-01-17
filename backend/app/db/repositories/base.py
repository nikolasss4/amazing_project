"""Base repository with common database operations."""

from typing import Any, Generic, TypeVar

from supabase import Client

from app.core.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T")


class BaseRepository(Generic[T]):
    """
    Base repository providing common database operations.

    Subclasses should define:
    - table_name: The Supabase table name
    - model_class: The Pydantic model for the entity
    """

    table_name: str
    model_class: type[T]

    def __init__(self, client: Client):
        self.client = client
        self.table = client.table(self.table_name)

    async def get_by_id(self, id: str) -> T | None:
        """Get a single record by ID."""
        response = self.table.select("*").eq("id", id).single().execute()
        if response.data:
            return self.model_class(**response.data)
        return None

    async def get_all(
        self,
        limit: int = 100,
        offset: int = 0,
        order_by: str = "created_at",
        ascending: bool = False,
    ) -> list[T]:
        """Get all records with pagination."""
        response = (
            self.table.select("*")
            .order(order_by, desc=not ascending)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return [self.model_class(**item) for item in response.data]

    async def create(self, data: dict[str, Any]) -> T:
        """Create a new record."""
        response = self.table.insert(data).execute()
        return self.model_class(**response.data[0])

    async def update(self, id: str, data: dict[str, Any]) -> T | None:
        """Update an existing record."""
        response = self.table.update(data).eq("id", id).execute()
        if response.data:
            return self.model_class(**response.data[0])
        return None

    async def delete(self, id: str) -> bool:
        """Delete a record by ID."""
        response = self.table.delete().eq("id", id).execute()
        return len(response.data) > 0

    async def exists(self, id: str) -> bool:
        """Check if a record exists."""
        response = self.table.select("id").eq("id", id).execute()
        return len(response.data) > 0
