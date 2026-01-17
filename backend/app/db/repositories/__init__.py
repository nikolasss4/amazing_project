"""Database repositories for data access."""

from app.db.repositories.base import BaseRepository
from app.db.repositories.profiles import ProfileRepository
from app.db.repositories.friends import FriendRepository
from app.db.repositories.leagues import LeagueRepository
from app.db.repositories.challenges import ChallengeRepository

__all__ = [
    "BaseRepository",
    "ProfileRepository",
    "FriendRepository",
    "LeagueRepository",
    "ChallengeRepository",
]
