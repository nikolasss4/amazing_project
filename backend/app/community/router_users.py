"""User profile API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.exceptions import NotFoundError
from app.core.security import AuthenticatedUser
from app.community.schemas import (
    ProfileResponse,
    ProfileSearchResponse,
    ProfileUpdateRequest,
)
from app.db.repositories.profiles import Profile, ProfileRepository
from app.db.supabase import SupabaseClient

router = APIRouter()


def get_profile_repository(client: SupabaseClient) -> ProfileRepository:
    """Get profile repository instance."""
    return ProfileRepository(client)


ProfileRepoDep = Annotated[ProfileRepository, Depends(get_profile_repository)]


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    user: AuthenticatedUser,
    repo: ProfileRepoDep,
) -> ProfileResponse:
    """
    Get the current user's profile.

    Returns the authenticated user's profile information.
    """
    profile = await repo.get_by_user_id(user.id)
    if not profile:
        raise NotFoundError("Profile", user.id)
    return ProfileResponse(**profile.model_dump())


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    request: ProfileUpdateRequest,
    user: AuthenticatedUser,
    repo: ProfileRepoDep,
) -> ProfileResponse:
    """
    Update the current user's profile.

    Updates username and/or avatar URL.
    """
    update_data = request.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    profile = await repo.update(user.id, update_data)
    if not profile:
        raise NotFoundError("Profile", user.id)
    return ProfileResponse(**profile.model_dump())


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user_profile(
    user_id: str,
    repo: ProfileRepoDep,
) -> ProfileResponse:
    """
    Get a user's profile by ID.

    Public endpoint to view any user's profile.
    """
    profile = await repo.get_by_user_id(user_id)
    if not profile:
        raise NotFoundError("Profile", user_id)
    return ProfileResponse(**profile.model_dump())


@router.get("", response_model=ProfileSearchResponse)
async def search_profiles(
    repo: ProfileRepoDep,
    q: str = Query(..., min_length=2, description="Username search query"),
    limit: int = Query(20, ge=1, le=50),
) -> ProfileSearchResponse:
    """
    Search for user profiles by username.

    Returns profiles matching the search query.
    """
    profiles = await repo.search_by_username(q, limit=limit)
    return ProfileSearchResponse(
        profiles=[ProfileResponse(**p.model_dump()) for p in profiles],
        count=len(profiles),
    )
