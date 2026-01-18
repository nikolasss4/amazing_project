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


class PearAssetWeight(BaseModel):
    """Asset with weight for position trading."""
    
    asset: str
    weight: float


class PearStopLossTakeProfit(BaseModel):
    """Stop loss or take profit configuration."""
    
    type: str  # 'PERCENTAGE' | 'DOLLAR' | 'POSITION_VALUE'
    value: float


class PearPositionRequest(BaseModel):
    """Request format for Pear Protocol position trades (pairs/baskets)."""
    
    slippage: float = Field(..., description="Slippage tolerance (0.01 = 1%)")
    executionType: str = Field(..., description="Execution type")
    leverage: float = Field(..., ge=1, le=100, description="Leverage (1-100)")
    usdValue: float = Field(..., gt=0, description="Total notional USD size")
    longAssets: list[PearAssetWeight] | None = None
    shortAssets: list[PearAssetWeight] | None = None
    triggerValue: str | None = None
    triggerType: str | None = None
    direction: str | None = None
    assetName: str | None = None
    marketCode: str | None = None
    twapDuration: int | None = None
    twapIntervalSeconds: int | None = None
    randomizeExecution: bool | None = None
    stopLoss: PearStopLossTakeProfit | None = None
    takeProfit: PearStopLossTakeProfit | None = None
    walletAddress: str | None = Field(None, description="User's wallet address", alias="walletAddress")
    
    class Config:
        populate_by_name = True


class PearPairTradeRequest(BaseModel):
    """Request to create a pair trade on Pear Protocol."""

    long_symbol: str = Field(..., description="Symbol to go long")
    short_symbol: str = Field(..., description="Symbol to go short")
    size: float = Field(..., gt=0, description="Trade size in USD")
    leverage: float = Field(default=1.0, ge=1.0, le=10.0)
    wallet_address: str | None = Field(None, description="User's wallet address")


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
    """Request to login with EIP-712 signature.
    
    Note: Uses camelCase for clientId to match Pear API.
    """

    method: str = Field(default="eip712", description="Authentication method")
    address: str = Field(..., description="Wallet address")
    clientId: str = Field(default="HLHackathon9", alias="client_id", description="Client ID")
    details: dict[str, str] = Field(..., description="Contains signature and timestamp")
    
    class Config:
        populate_by_name = True


class PearAuthTokenResponse(BaseModel):
    """Authentication token response from Pear API."""

    accessToken: str = Field(..., alias="access_token")
    refreshToken: str | None = Field(default=None, alias="refresh_token")
    expiresIn: int | None = Field(default=None, alias="expires_in")
    tokenType: str = Field(default="Bearer", alias="token_type")
    
    class Config:
        populate_by_name = True


class PearRefreshTokenRequest(BaseModel):
    """Request to refresh access token."""

    refresh_token: str


class AgentWalletStatus(str, Enum):
    """Agent wallet status."""

    NOT_FOUND = "NOT_FOUND"
    ACTIVE = "ACTIVE"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    EXPIRED = "EXPIRED"


class PearAgentWalletResponse(BaseModel):
    """Agent wallet response from Pear API.
    
    Maps various field names from API response.
    """

    agentWalletAddress: str | None = Field(default=None, alias="agent_wallet_address")
    agentAddress: str | None = Field(default=None, alias="agent_address") 
    address: str | None = None
    status: AgentWalletStatus = AgentWalletStatus.NOT_FOUND
    expiresAt: datetime | None = Field(default=None, alias="expires_at")
    createdAt: datetime | None = Field(default=None, alias="created_at")
    message: str | None = None
    
    class Config:
        populate_by_name = True
    
    @property
    def wallet_address(self) -> str | None:
        """Get the agent wallet address from any of the possible fields."""
        return self.agentWalletAddress or self.agentAddress or self.address


class PearCreateAgentWalletRequest(BaseModel):
    """Request to create an agent wallet."""
    
    clientId: str = Field(..., alias="client_id", description="Client ID")
    
    class Config:
        populate_by_name = True


class PearCreateAgentWalletResponse(BaseModel):
    """Response from creating an agent wallet."""

    agentWalletAddress: str | None = Field(default=None, alias="agent_wallet_address")
    agentAddress: str | None = Field(default=None, alias="agent_address")
    address: str | None = None
    status: str = "PENDING_APPROVAL"
    expiresAt: datetime | None = Field(default=None, alias="expires_at")
    createdAt: datetime | None = Field(default=None, alias="created_at")
    message: str | None = None
    
    class Config:
        populate_by_name = True
    
    @property
    def wallet_address(self) -> str | None:
        """Get the agent wallet address from any of the possible fields."""
        return self.agentWalletAddress or self.agentAddress or self.address


class PearApproveAgentWalletRequest(BaseModel):
    """Request to approve an agent wallet on Hyperliquid.
    
    The approval is done directly on Hyperliquid, not through Pear API.
    """

    agentAddress: str = Field(..., alias="agent_address", description="The agent wallet address to approve")
    agentName: str = Field(default="PearProtocol", alias="agent_name", description="Name for the agent")
    
    class Config:
        populate_by_name = True
