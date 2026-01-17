"""Friends API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.exceptions import NotFoundError, ValidationError
from app.core.security import AuthenticatedUser
from app.community.schemas import (
    FriendRequestCreate,
    FriendResponse,
    FriendsListResponse,
    PendingRequestsResponse,
)
from app.db.repositories.friends import FriendRepository, FriendStatus
from app.db.supabase import SupabaseClient

router = APIRouter()


def get_friend_repository(client: SupabaseClient) -> FriendRepository:
    """Get friend repository instance."""
    return FriendRepository(client)


FriendRepoDep = Annotated[FriendRepository, Depends(get_friend_repository)]


@router.get("", response_model=FriendsListResponse)
async def get_friends(
    user: AuthenticatedUser,
    repo: FriendRepoDep,
) -> FriendsListResponse:
    """
    Get all friends for the current user.

    Returns only accepted friend relationships.
    """
    friends = await repo.get_friends(user.id)
    return FriendsListResponse(
        friends=[FriendResponse(**f.model_dump()) for f in friends],
        count=len(friends),
    )


@router.get("/requests", response_model=PendingRequestsResponse)
async def get_pending_requests(
    user: AuthenticatedUser,
    repo: FriendRepoDep,
) -> PendingRequestsResponse:
    """
    Get pending friend requests.

    Returns both incoming requests (where user is addressee)
    and outgoing requests (where user is requester).
    """
    incoming = await repo.get_pending_requests(user.id)
    outgoing = await repo.get_sent_requests(user.id)

    return PendingRequestsResponse(
        incoming=[FriendResponse(**f.model_dump()) for f in incoming],
        outgoing=[FriendResponse(**f.model_dump()) for f in outgoing],
    )


@router.post("/requests", response_model=FriendResponse, status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    request: FriendRequestCreate,
    user: AuthenticatedUser,
    repo: FriendRepoDep,
) -> FriendResponse:
    """
    Send a friend request to another user.

    Cannot send requests to self or if relationship already exists.
    """
    if request.addressee_id == user.id:
        raise ValidationError("Cannot send friend request to yourself")

    # Check if relationship already exists
    existing = await repo.get_relationship(user.id, request.addressee_id)
    if existing:
        if existing.status == FriendStatus.ACCEPTED:
            raise ValidationError("Already friends with this user")
        elif existing.status == FriendStatus.PENDING:
            raise ValidationError("Friend request already pending")
        elif existing.status == FriendStatus.BLOCKED:
            raise ValidationError("Cannot send request to this user")

    friend = await repo.send_request(user.id, request.addressee_id)
    return FriendResponse(**friend.model_dump())


@router.post("/requests/{request_id}/accept", response_model=FriendResponse)
async def accept_friend_request(
    request_id: str,
    user: AuthenticatedUser,
    repo: FriendRepoDep,
) -> FriendResponse:
    """
    Accept a pending friend request.

    Only the addressee can accept a request.
    """
    # Verify request exists and user is the addressee
    existing = await repo.get_by_id(request_id)
    if not existing:
        raise NotFoundError("Friend request", request_id)

    if existing.addressee_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to accept this request",
        )

    if existing.status != FriendStatus.PENDING:
        raise ValidationError(f"Request is not pending, status: {existing.status}")

    friend = await repo.accept_request(request_id)
    if not friend:
        raise NotFoundError("Friend request", request_id)
    return FriendResponse(**friend.model_dump())


@router.post("/requests/{request_id}/reject", response_model=FriendResponse)
async def reject_friend_request(
    request_id: str,
    user: AuthenticatedUser,
    repo: FriendRepoDep,
) -> FriendResponse:
    """
    Reject a pending friend request.

    Only the addressee can reject a request.
    """
    # Verify request exists and user is the addressee
    existing = await repo.get_by_id(request_id)
    if not existing:
        raise NotFoundError("Friend request", request_id)

    if existing.addressee_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reject this request",
        )

    if existing.status != FriendStatus.PENDING:
        raise ValidationError(f"Request is not pending, status: {existing.status}")

    friend = await repo.reject_request(request_id)
    if not friend:
        raise NotFoundError("Friend request", request_id)
    return FriendResponse(**friend.model_dump())


@router.delete("/{friend_id}")
async def remove_friend(
    friend_id: str,
    user: AuthenticatedUser,
    repo: FriendRepoDep,
) -> dict[str, bool]:
    """
    Remove a friend relationship.

    Either party can remove the friendship.
    """
    existing = await repo.get_by_id(friend_id)
    if not existing:
        raise NotFoundError("Friend relationship", friend_id)

    # Verify user is part of this relationship
    if existing.requester_id != user.id and existing.addressee_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to remove this friend",
        )

    success = await repo.delete(friend_id)
    return {"success": success}
