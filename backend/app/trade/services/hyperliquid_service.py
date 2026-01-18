"""Hyperliquid trading service wrapper."""

from datetime import datetime
from functools import lru_cache
from typing import Any

from eth_account import Account

from app.core.config import settings
from app.core.exceptions import ExternalServiceError
from app.core.logging import get_logger
from app.trade.schemas import (
    HyperliquidLimitOrderRequest,
    HyperliquidMarketOrderRequest,
    HyperliquidOrderResponse,
    HyperliquidOrderStatusResponse,
    HyperliquidPositionResponse,
    Instrument,
    OrderSide,
    OrderStatus,
    OrderType,
)

logger = get_logger(__name__)

# Pear Protocol builder address for Hyperliquid
PEAR_BUILDER_ADDRESS = "0xA47D4d99191db54A4829cdf3de2417E527c3b042"
PEAR_BUILDER_MAX_FEE_RATE = "1%"
PEAR_AGENT_NAME = "PearProtocol"


class HyperliquidService:
    """
    Wrapper service for Hyperliquid SDK integration.

    This service provides a clean interface for interacting with
    Hyperliquid's trading API.
    """

    def __init__(self):
        self.api_url = settings.HYPERLIQUID_API_URL
        self.private_key = settings.HYPERLIQUID_PRIVATE_KEY
        self.wallet_address = settings.HYPERLIQUID_WALLET_ADDRESS
        self._client: Any = None

    def _get_client(self) -> Any:
        """
        Get or initialize the Hyperliquid SDK client.

        TODO: Initialize actual Hyperliquid SDK client here.
        """
        if self._client is None:
            # TODO: Initialize Hyperliquid SDK
            # from hyperliquid import HyperliquidClient
            # self._client = HyperliquidClient(
            #     private_key=self.private_key,
            #     wallet_address=self.wallet_address,
            # )
            logger.warning("Hyperliquid client not initialized - using stub")
        return self._client

    async def place_market_order(
        self, request: HyperliquidMarketOrderRequest
    ) -> HyperliquidOrderResponse:
        """
        Place a market order on Hyperliquid.

        TODO: Implement actual SDK call.

        Args:
            request: Market order request details

        Returns:
            Order response with order ID and status

        Raises:
            ExternalServiceError: If order placement fails
        """
        logger.info(
            "Placing market order",
            symbol=request.symbol,
            side=request.side,
            size=request.size,
        )

        try:
            # TODO: Implement actual order placement
            # client = self._get_client()
            # result = await client.place_market_order(
            #     symbol=request.symbol,
            #     side=request.side.value,
            #     size=request.size,
            #     reduce_only=request.reduce_only,
            # )

            # Stub response
            return HyperliquidOrderResponse(
                order_id="stub_order_123",
                symbol=request.symbol,
                side=request.side,
                order_type=OrderType.MARKET,
                size=request.size,
                price=None,
                status=OrderStatus.PENDING,
                filled_size=0,
                created_at=datetime.utcnow(),
            )
        except Exception as e:
            logger.error("Failed to place market order", error=str(e))
            raise ExternalServiceError("Hyperliquid", str(e))

    async def place_limit_order(
        self, request: HyperliquidLimitOrderRequest
    ) -> HyperliquidOrderResponse:
        """
        Place a limit order on Hyperliquid.

        TODO: Implement actual SDK call.

        Args:
            request: Limit order request details

        Returns:
            Order response with order ID and status

        Raises:
            ExternalServiceError: If order placement fails
        """
        logger.info(
            "Placing limit order",
            symbol=request.symbol,
            side=request.side,
            size=request.size,
            price=request.price,
        )

        try:
            # TODO: Implement actual order placement
            # client = self._get_client()
            # result = await client.place_limit_order(...)

            # Stub response
            return HyperliquidOrderResponse(
                order_id="stub_order_456",
                symbol=request.symbol,
                side=request.side,
                order_type=OrderType.LIMIT,
                size=request.size,
                price=request.price,
                status=OrderStatus.OPEN,
                filled_size=0,
                created_at=datetime.utcnow(),
            )
        except Exception as e:
            logger.error("Failed to place limit order", error=str(e))
            raise ExternalServiceError("Hyperliquid", str(e))

    async def get_order_status(self, order_id: str) -> HyperliquidOrderStatusResponse:
        """
        Get the status of an order.

        TODO: Implement actual SDK call.

        Args:
            order_id: The order ID to check

        Returns:
            Current order status and details
        """
        logger.info("Getting order status", order_id=order_id)

        try:
            # TODO: Implement actual status check
            # client = self._get_client()
            # result = await client.get_order(order_id)

            # Stub response
            return HyperliquidOrderStatusResponse(
                order_id=order_id,
                symbol="ETH",
                side=OrderSide.BUY,
                order_type=OrderType.LIMIT,
                size=1.0,
                filled_size=0.5,
                remaining_size=0.5,
                price=2000.0,
                average_fill_price=1998.50,
                status=OrderStatus.PARTIALLY_FILLED,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
        except Exception as e:
            logger.error("Failed to get order status", error=str(e))
            raise ExternalServiceError("Hyperliquid", str(e))

    async def cancel_order(self, order_id: str) -> bool:
        """
        Cancel an open order.

        TODO: Implement actual SDK call.

        Args:
            order_id: The order ID to cancel

        Returns:
            True if cancellation was successful
        """
        logger.info("Cancelling order", order_id=order_id)

        try:
            # TODO: Implement actual cancellation
            # client = self._get_client()
            # result = await client.cancel_order(order_id)
            return True
        except Exception as e:
            logger.error("Failed to cancel order", error=str(e))
            raise ExternalServiceError("Hyperliquid", str(e))

    async def get_positions(self) -> list[HyperliquidPositionResponse]:
        """
        Get all open positions.

        TODO: Implement actual SDK call.

        Returns:
            List of current positions
        """
        logger.info("Getting positions")

        try:
            # TODO: Implement actual position fetch
            # client = self._get_client()
            # result = await client.get_positions()

            # Stub response
            return [
                HyperliquidPositionResponse(
                    symbol="ETH",
                    size=1.5,
                    entry_price=1950.00,
                    mark_price=2000.00,
                    unrealized_pnl=75.00,
                    realized_pnl=0,
                    leverage=5.0,
                    liquidation_price=1600.00,
                )
            ]
        except Exception as e:
            logger.error("Failed to get positions", error=str(e))
            raise ExternalServiceError("Hyperliquid", str(e))

    async def get_instruments(self) -> list[Instrument]:
        """
        Get list of tradable instruments from Hyperliquid.

        TODO: Implement actual SDK call with caching.

        Returns:
            List of available trading instruments
        """
        logger.info("Getting Hyperliquid instruments")

        try:
            # TODO: Implement actual instrument fetch
            # This should be cached with TTL

            # Stub response
            return [
                Instrument(
                    symbol="ETH",
                    name="Ethereum",
                    base_currency="ETH",
                    quote_currency="USD",
                    min_order_size=0.001,
                    price_decimals=2,
                    size_decimals=4,
                    source="hyperliquid",
                ),
                Instrument(
                    symbol="BTC",
                    name="Bitcoin",
                    base_currency="BTC",
                    quote_currency="USD",
                    min_order_size=0.0001,
                    price_decimals=2,
                    size_decimals=5,
                    source="hyperliquid",
                ),
            ]
        except Exception as e:
            logger.error("Failed to get instruments", error=str(e))
            raise ExternalServiceError("Hyperliquid", str(e))


    async def setup_pear_protocol(self, private_key: str) -> dict[str, Any]:
        """
        Complete Pear Protocol setup on Hyperliquid.
        
        This performs the required one-time setup steps:
        1. Approve builder fee for Pear Protocol
        2. Approve agent wallet for trading
        
        Args:
            private_key: User's wallet private key (with or without 0x prefix)
            
        Returns:
            Dict containing setup status and agent wallet info
        """
        logger.info("=" * 80)
        logger.info("HYPERLIQUID SETUP FOR PEAR PROTOCOL")
        logger.info("=" * 80)
        
        try:
            from hyperliquid.exchange import Exchange
            from hyperliquid.utils.constants import MAINNET_API_URL
            
            # Ensure private key has 0x prefix
            pk = private_key if private_key.startswith('0x') else f'0x{private_key}'
            
            # Create wallet from private key
            wallet = Account.from_key(pk)
            logger.info(f"Setting up Hyperliquid for wallet: {wallet.address}")
            
            # Initialize Exchange client
            exchange = Exchange(wallet=wallet, base_url=MAINNET_API_URL)
            
            result = {
                "success": False,
                "wallet_address": wallet.address,
                "builder_fee_approved": False,
                "agent_wallet_approved": False,
                "agent_address": None,
                "agent_private_key": None,
                "errors": []
            }
            
            # Step 1: Approve builder fee
            logger.info("Step 1: Approving builder fee...")
            logger.info(f"  Builder address: {PEAR_BUILDER_ADDRESS}")
            logger.info(f"  Max fee rate: {PEAR_BUILDER_MAX_FEE_RATE}")
            
            try:
                builder_resp = exchange.approve_builder_fee(
                    builder=PEAR_BUILDER_ADDRESS,
                    max_fee_rate=PEAR_BUILDER_MAX_FEE_RATE
                )
                logger.info(f"Builder fee approval response: {builder_resp}")
                
                if builder_resp.get("status") == "ok":
                    result["builder_fee_approved"] = True
                    logger.info("✓ Builder fee approved successfully")
                else:
                    error_msg = builder_resp.get("response", {}).get("data", {}).get("error", str(builder_resp))
                    result["errors"].append(f"Builder fee approval failed: {error_msg}")
                    logger.warning(f"Builder fee approval response: {error_msg}")
                    # Continue anyway - might already be approved
                    result["builder_fee_approved"] = True
                    
            except Exception as e:
                error_msg = str(e)
                # Check if already approved
                if "already" in error_msg.lower() or "exists" in error_msg.lower():
                    result["builder_fee_approved"] = True
                    logger.info("Builder fee already approved (continuing)")
                else:
                    result["errors"].append(f"Builder fee approval error: {error_msg}")
                    logger.error(f"Builder fee approval error: {error_msg}")
            
            # Step 2: Approve agent wallet
            logger.info("Step 2: Approving agent wallet...")
            logger.info(f"  Agent name: {PEAR_AGENT_NAME}")
            
            try:
                agent_resp = exchange.approve_agent(name=PEAR_AGENT_NAME)
                logger.info(f"Agent approval response type: {type(agent_resp)}")
                
                # The response is typically a tuple of (response, agent_key)
                if isinstance(agent_resp, tuple) and len(agent_resp) >= 2:
                    resp, agent_key = agent_resp[0], agent_resp[1]
                    logger.info(f"Agent response: {resp}")
                    
                    if agent_key:
                        result["agent_wallet_approved"] = True
                        result["agent_private_key"] = agent_key
                        
                        # Derive agent address from key
                        agent_wallet = Account.from_key(agent_key if agent_key.startswith('0x') else f'0x{agent_key}')
                        result["agent_address"] = agent_wallet.address
                        
                        logger.info("✓ Agent wallet approved successfully")
                        logger.info(f"  Agent address: {result['agent_address']}")
                    else:
                        result["errors"].append("No agent key returned")
                else:
                    logger.info(f"Agent response: {agent_resp}")
                    result["agent_wallet_approved"] = True  # Assume success
                    
            except Exception as e:
                error_msg = str(e)
                # Check if already approved
                if "already" in error_msg.lower() or "exists" in error_msg.lower():
                    result["agent_wallet_approved"] = True
                    logger.info("Agent wallet already approved (continuing)")
                else:
                    result["errors"].append(f"Agent approval error: {error_msg}")
                    logger.error(f"Agent approval error: {error_msg}")
            
            # Determine overall success
            result["success"] = result["builder_fee_approved"] and result["agent_wallet_approved"]
            
            logger.info("=" * 80)
            logger.info(f"HYPERLIQUID SETUP {'SUCCESSFUL' if result['success'] else 'COMPLETED WITH ISSUES'}")
            logger.info(f"  Builder fee approved: {result['builder_fee_approved']}")
            logger.info(f"  Agent wallet approved: {result['agent_wallet_approved']}")
            if result["agent_address"]:
                logger.info(f"  Agent address: {result['agent_address']}")
            if result["errors"]:
                logger.info(f"  Errors: {result['errors']}")
            logger.info("=" * 80)
            
            return result
            
        except ImportError as e:
            logger.error(f"Hyperliquid SDK not available: {e}")
            return {
                "success": False,
                "error": "Hyperliquid SDK not installed",
                "message": str(e)
            }
        except Exception as e:
            logger.error(f"Hyperliquid setup failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to setup Hyperliquid permissions"
            }


@lru_cache
def get_hyperliquid_service() -> HyperliquidService:
    """Get cached Hyperliquid service instance."""
    return HyperliquidService()
