"""Pear Protocol trading API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import AuthenticatedUser
from app.trade.schemas import (
    AgentWalletStatus,
    PearAgentWalletResponse,
    PearApproveAgentWalletRequest,
    PearAuthTokenResponse,
    PearBucketStatusResponse,
    PearBucketStrategyRequest,
    PearBucketStrategyResponse,
    PearCreateAgentWalletResponse,
    PearEIP712MessageResponse,
    PearLoginRequest,
    PearPairPositionResponse,
    PearPairTradeRequest,
    PearPairTradeResponse,
    PearRefreshTokenRequest,
)
from app.trade.services.pear_service import PearService, get_pear_service

router = APIRouter()

# Dependency for Pear service
PearServiceDep = Annotated[PearService, Depends(get_pear_service)]


# ============================================================================
# Authentication & Agent Wallet Endpoints
# ============================================================================


@router.get("/auth/eip712-message", response_model=PearEIP712MessageResponse)
async def get_eip712_message(
    address: str = Query(..., description="Wallet address"),
    client_id: str = Query(default="APITRADER", description="Client ID"),
    service: PearServiceDep = None,
) -> PearEIP712MessageResponse:
    """
    Get EIP-712 message structure for wallet signature.

    This message should be signed by the user's wallet and sent to the login endpoint.

    Args:
        address: The user's wallet address
        client_id: Client identifier (use "APITRADER" for individual integrations)

    Returns:
        EIP-712 typed data structure to be signed
    """
    return await service.get_eip712_message(address, client_id)


@router.post("/auth/login", response_model=PearAuthTokenResponse)
async def login_with_signature(
    request: PearLoginRequest,
    service: PearServiceDep,
) -> PearAuthTokenResponse:
    """
    Login with EIP-712 signature to obtain access token.

    The signature should be obtained by signing the EIP-712 message
    from the /auth/eip712-message endpoint.

    Args:
        request: Login request with wallet address and signature

    Returns:
        Access token and refresh token for API authentication
    """
    return await service.login_with_signature(request)


@router.post("/auth/refresh", response_model=PearAuthTokenResponse)
async def refresh_access_token(
    request: PearRefreshTokenRequest,
    service: PearServiceDep,
) -> PearAuthTokenResponse:
    """
    Refresh access token using refresh token.

    Use this endpoint when the access token expires to get a new one.

    Args:
        request: Refresh token request

    Returns:
        New access token and refresh token
    """
    return await service.refresh_access_token(request.refresh_token)


@router.get("/agent-wallet", response_model=PearAgentWalletResponse)
async def get_agent_wallet(
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> PearAgentWalletResponse:
    """
    Check if user has an agent wallet and its status.

    Returns:
        Agent wallet information including address and status
        - NOT_FOUND: No wallet exists
        - ACTIVE: Wallet is active and can be used
        - EXPIRED: Wallet has expired and needs to be recreated
    """
    return await service.get_agent_wallet()


@router.post("/agent-wallet", response_model=PearCreateAgentWalletResponse)
async def create_agent_wallet(
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> PearCreateAgentWalletResponse:
    """
    Create a new agent wallet for the user.

    The agent wallet allows Pear Protocol to execute trades on Hyperliquid
    on behalf of the user. After creation, the user must approve the wallet.

    Returns:
        New agent wallet information including address
    """
    return await service.create_agent_wallet()


@router.post("/agent-wallet/approve")
async def approve_agent_wallet(
    request: PearApproveAgentWalletRequest,
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> dict[str, str]:
    """
    Approve an agent wallet to allow Pear Protocol to use it.

    The user must sign a message with their wallet to authorize
    Pear Protocol to use the agent wallet on Hyperliquid.

    Args:
        request: Agent wallet approval request with signature

    Returns:
        Success confirmation
    """
    success = await service.approve_agent_wallet(
        request.agent_address, request.signature
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to approve agent wallet",
        )
    return {"status": "approved", "agent_address": request.agent_address}


# ============================================================================
# Pair Trading Endpoints
# ============================================================================


@router.post("/pairs", response_model=PearPairTradeResponse)
async def create_pair_trade(
    request: PearPairTradeRequest,
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> PearPairTradeResponse:
    """
    Create a new pair trade.

    Goes long on one asset and short on another simultaneously
    to trade the relative performance between them.
    """
    return await service.create_pair_trade(request)


@router.get("/pairs/positions", response_model=list[PearPairPositionResponse])
async def get_pair_positions(
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> list[PearPairPositionResponse]:
    """
    Get all pair trade positions.

    Returns current positions with entry prices and PnL.
    """
    return await service.get_pair_positions()


@router.delete("/pairs/{trade_id}")
async def close_pair_trade(
    trade_id: str,
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> dict[str, bool]:
    """
    Close a pair trade.

    Closes both the long and short positions simultaneously.
    """
    success = await service.close_pair_trade(trade_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to close pair trade",
        )
    return {"success": True}


# ============================================================================
# Bucket Trading Endpoints
# ============================================================================


@router.post("/buckets", response_model=PearBucketStrategyResponse)
async def create_bucket_strategy(
    request: PearBucketStrategyRequest,
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> PearBucketStrategyResponse:
    """
    Create a new bucket trading strategy.

    A bucket is a weighted portfolio of assets that can be
    automatically rebalanced.
    """
    # Validate weights sum to 1
    total_weight = sum(asset.weight for asset in request.assets)
    if abs(total_weight - 1.0) > 0.001:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset weights must sum to 1.0, got {total_weight}",
        )

    return await service.create_bucket_strategy(request)


@router.get("/buckets", response_model=list[PearBucketStatusResponse])
async def get_bucket_strategies(
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> list[PearBucketStatusResponse]:
    """
    Get all bucket strategies.

    Returns all active bucket strategies with current values.
    """
    return await service.get_bucket_strategies()


@router.get("/buckets/{strategy_id}", response_model=PearBucketStatusResponse)
async def get_bucket_status(
    strategy_id: str,
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> PearBucketStatusResponse:
    """
    Get the status of a specific bucket strategy.

    Returns current holdings, values, and rebalance status.
    """
    return await service.get_bucket_status(strategy_id)
