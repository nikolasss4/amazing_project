"""Pear Protocol trading API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import AuthenticatedUser
from app.trade.schemas import (
    PearBucketStatusResponse,
    PearBucketStrategyRequest,
    PearBucketStrategyResponse,
    PearPairPositionResponse,
    PearPairTradeRequest,
    PearPairTradeResponse,
)
from app.trade.services.pear_service import PearService, get_pear_service

router = APIRouter()

# Dependency for Pear service
PearServiceDep = Annotated[PearService, Depends(get_pear_service)]


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
