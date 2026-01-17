"""Pydantic schemas for trade module."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ============================================================================
# Common Schemas
# ============================================================================


class OrderSide(str, Enum):
    """Order side."""

    BUY = "buy"
    SELL = "sell"


class OrderType(str, Enum):
    """Order type."""

    MARKET = "market"
    LIMIT = "limit"


class OrderStatus(str, Enum):
    """Order status."""

    PENDING = "pending"
    OPEN = "open"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    FAILED = "failed"


class Instrument(BaseModel):
    """Tradable instrument."""

    symbol: str
    name: str
    base_currency: str
    quote_currency: str
    min_order_size: float
    price_decimals: int
    size_decimals: int
    source: str  # "hyperliquid" or "pear"


# ============================================================================
# Hyperliquid Schemas
# ============================================================================


class HyperliquidMarketOrderRequest(BaseModel):
    """Request to place a market order on Hyperliquid."""

    symbol: str = Field(..., description="Trading pair symbol, e.g., 'ETH'")
    side: OrderSide
    size: float = Field(..., gt=0, description="Order size in base currency")
    reduce_only: bool = False


class HyperliquidLimitOrderRequest(BaseModel):
    """Request to place a limit order on Hyperliquid."""

    symbol: str = Field(..., description="Trading pair symbol")
    side: OrderSide
    size: float = Field(..., gt=0)
    price: float = Field(..., gt=0, description="Limit price")
    reduce_only: bool = False
    time_in_force: str = "GTC"  # GTC, IOC, ALO


class HyperliquidOrderResponse(BaseModel):
    """Response from Hyperliquid order placement."""

    order_id: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    size: float
    price: float | None
    status: OrderStatus
    filled_size: float = 0
    created_at: datetime


class HyperliquidOrderStatusResponse(BaseModel):
    """Order status response from Hyperliquid."""

    order_id: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    size: float
    filled_size: float
    remaining_size: float
    price: float | None
    average_fill_price: float | None
    status: OrderStatus
    created_at: datetime
    updated_at: datetime


class HyperliquidPositionResponse(BaseModel):
    """Position response from Hyperliquid."""

    symbol: str
    size: float
    entry_price: float
    mark_price: float
    unrealized_pnl: float
    realized_pnl: float
    leverage: float
    liquidation_price: float | None


# ============================================================================
# Pear Protocol Schemas
# ============================================================================


class PearPairTradeRequest(BaseModel):
    """Request to create a pair trade on Pear Protocol."""

    long_symbol: str = Field(..., description="Symbol to go long")
    short_symbol: str = Field(..., description="Symbol to go short")
    size: float = Field(..., gt=0, description="Trade size in USD")
    leverage: float = Field(default=1.0, ge=1.0, le=10.0)


class PearPairTradeResponse(BaseModel):
    """Response from Pear pair trade creation."""

    trade_id: str
    long_symbol: str
    short_symbol: str
    size: float
    leverage: float
    status: str
    created_at: datetime


class PearPairPositionResponse(BaseModel):
    """Pair trade position response from Pear."""

    trade_id: str
    long_symbol: str
    short_symbol: str
    long_entry_price: float
    short_entry_price: float
    current_long_price: float
    current_short_price: float
    size: float
    unrealized_pnl: float
    status: str
    created_at: datetime


class PearBucketAsset(BaseModel):
    """Asset in a bucket strategy."""

    symbol: str
    weight: float = Field(..., ge=0, le=1, description="Weight in bucket (0-1)")


class PearBucketStrategyRequest(BaseModel):
    """Request to create a bucket trading strategy."""

    name: str
    assets: list[PearBucketAsset] = Field(..., min_length=2)
    total_size: float = Field(..., gt=0, description="Total size in USD")
    rebalance_threshold: float = Field(
        default=0.05, ge=0, le=0.5, description="Rebalance when deviation exceeds this"
    )


class PearBucketStrategyResponse(BaseModel):
    """Response from bucket strategy creation."""

    strategy_id: str
    name: str
    assets: list[PearBucketAsset]
    total_size: float
    status: str
    created_at: datetime


class PearBucketStatusResponse(BaseModel):
    """Bucket strategy status response."""

    strategy_id: str
    name: str
    assets: list[dict[str, Any]]  # Asset with current values
    total_value: float
    unrealized_pnl: float
    status: str
    last_rebalance: datetime | None
    created_at: datetime


# ============================================================================
# Instruments Schemas
# ============================================================================


class InstrumentsListResponse(BaseModel):
    """Response containing list of tradable instruments."""

    instruments: list[Instrument]
    count: int
    cached_at: datetime | None = None


# ============================================================================
# Pear Authentication & Agent Wallet Schemas
# ============================================================================


class PearEIP712MessageResponse(BaseModel):
    """EIP-712 message structure for wallet signature."""

    domain: dict[str, Any]
    types: dict[str, Any]
    message: dict[str, Any]


class PearLoginRequest(BaseModel):
    """Request to login with EIP-712 signature."""

    method: str = Field(default="eip712", description="Authentication method")
    address: str = Field(..., description="Wallet address")
    client_id: str = Field(default="APITRADER", description="Client ID")
    details: dict[str, str] = Field(..., description="Contains signature")


class PearAuthTokenResponse(BaseModel):
    """Authentication token response."""

    access_token: str
    refresh_token: str
    expires_in: int | None = None
    token_type: str = "Bearer"


class PearRefreshTokenRequest(BaseModel):
    """Request to refresh access token."""

    refresh_token: str


class AgentWalletStatus(str, Enum):
    """Agent wallet status."""

    NOT_FOUND = "NOT_FOUND"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"


class PearAgentWalletResponse(BaseModel):
    """Agent wallet response."""

    address: str | None = None
    status: AgentWalletStatus
    expires_at: datetime | None = None
    created_at: datetime | None = None


class PearCreateAgentWalletResponse(BaseModel):
    """Response from creating an agent wallet."""

    address: str
    status: str
    expires_at: datetime
    created_at: datetime


class PearApproveAgentWalletRequest(BaseModel):
    """Request to approve an agent wallet."""

    agent_address: str = Field(..., description="The agent wallet address to approve")
    signature: str = Field(..., description="User's signature approving the agent wallet")
