"""Hyperliquid trading API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import AuthenticatedUser
from app.trade.schemas import (
    HyperliquidLimitOrderRequest,
    HyperliquidMarketOrderRequest,
    HyperliquidOrderResponse,
    HyperliquidOrderStatusResponse,
    HyperliquidPositionResponse,
)
from app.trade.services.hyperliquid_service import (
    HyperliquidService,
    get_hyperliquid_service,
)

router = APIRouter()

# Dependency for Hyperliquid service
HyperliquidServiceDep = Annotated[HyperliquidService, Depends(get_hyperliquid_service)]


@router.post("/market-order", response_model=HyperliquidOrderResponse)
async def place_market_order(
    request: HyperliquidMarketOrderRequest,
    user: AuthenticatedUser,
    service: HyperliquidServiceDep,
) -> HyperliquidOrderResponse:
    """
    Place a market order on Hyperliquid.

    Executes immediately at the current market price.
    """
    return await service.place_market_order(request)


@router.post("/limit-order", response_model=HyperliquidOrderResponse)
async def place_limit_order(
    request: HyperliquidLimitOrderRequest,
    user: AuthenticatedUser,
    service: HyperliquidServiceDep,
) -> HyperliquidOrderResponse:
    """
    Place a limit order on Hyperliquid.

    Order will be placed in the order book at the specified price.
    """
    return await service.place_limit_order(request)


@router.get("/orders/{order_id}", response_model=HyperliquidOrderStatusResponse)
async def get_order_status(
    order_id: str,
    user: AuthenticatedUser,
    service: HyperliquidServiceDep,
) -> HyperliquidOrderStatusResponse:
    """
    Get the status of a specific order.

    Returns current fill status, average price, and timestamps.
    """
    return await service.get_order_status(order_id)


@router.delete("/orders/{order_id}")
async def cancel_order(
    order_id: str,
    user: AuthenticatedUser,
    service: HyperliquidServiceDep,
) -> dict[str, bool]:
    """
    Cancel an open order.

    Only unfilled or partially filled orders can be cancelled.
    """
    success = await service.cancel_order(order_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to cancel order",
        )
    return {"success": True}


@router.get("/positions", response_model=list[HyperliquidPositionResponse])
async def get_positions(
    user: AuthenticatedUser,
    service: HyperliquidServiceDep,
) -> list[HyperliquidPositionResponse]:
    """
    Get all open positions.

    Returns position details including entry price, PnL, and leverage.
    """
    return await service.get_positions()
