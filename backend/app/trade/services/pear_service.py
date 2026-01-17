"""Pear Protocol trading service wrapper."""

from datetime import datetime
from functools import lru_cache
from typing import Any

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalServiceError
from app.core.logging import get_logger
from app.trade.schemas import (
    Instrument,
    PearBucketStatusResponse,
    PearBucketStrategyRequest,
    PearBucketStrategyResponse,
    PearPairPositionResponse,
    PearPairTradeRequest,
    PearPairTradeResponse,
)

logger = get_logger(__name__)


class PearService:
    """
    API client wrapper for Pear Protocol integration.

    This service provides typed request/response models for
    interacting with Pear Protocol's API.
    """

    def __init__(self):
        self.base_url = settings.PEAR_API_URL
        self.api_key = settings.PEAR_API_KEY
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _request(
        self,
        method: str,
        endpoint: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Make an authenticated request to Pear API.

        TODO: Implement actual API calls.
        """
        client = await self._get_client()

        try:
            if method == "GET":
                response = await client.get(endpoint)
            elif method == "POST":
                response = await client.post(endpoint, json=data)
            elif method == "DELETE":
                response = await client.delete(endpoint)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(
                "Pear API error",
                status_code=e.response.status_code,
                detail=e.response.text,
            )
            raise ExternalServiceError("Pear Protocol", str(e))
        except httpx.RequestError as e:
            logger.error("Pear API request failed", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    # ========================================================================
    # Pair Trading
    # ========================================================================

    async def create_pair_trade(
        self, request: PearPairTradeRequest
    ) -> PearPairTradeResponse:
        """
        Create a new pair trade on Pear Protocol.

        TODO: Implement actual API call.

        Args:
            request: Pair trade request with long/short symbols and size

        Returns:
            Trade response with trade ID and status
        """
        logger.info(
            "Creating pair trade",
            long=request.long_symbol,
            short=request.short_symbol,
            size=request.size,
        )

        try:
            # TODO: Implement actual API call
            # response = await self._request(
            #     "POST",
            #     "/v1/pairs/trades",
            #     data=request.model_dump(),
            # )

            # Stub response
            return PearPairTradeResponse(
                trade_id="pear_trade_123",
                long_symbol=request.long_symbol,
                short_symbol=request.short_symbol,
                size=request.size,
                leverage=request.leverage,
                status="open",
                created_at=datetime.utcnow(),
            )
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to create pair trade", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def get_pair_positions(self) -> list[PearPairPositionResponse]:
        """
        Get all pair trade positions.

        TODO: Implement actual API call.

        Returns:
            List of current pair trade positions
        """
        logger.info("Getting pair positions")

        try:
            # TODO: Implement actual API call
            # response = await self._request("GET", "/v1/pairs/positions")

            # Stub response
            return [
                PearPairPositionResponse(
                    trade_id="pear_trade_123",
                    long_symbol="ETH",
                    short_symbol="BTC",
                    long_entry_price=2000.00,
                    short_entry_price=45000.00,
                    current_long_price=2050.00,
                    current_short_price=44500.00,
                    size=1000.00,
                    unrealized_pnl=36.11,
                    status="open",
                    created_at=datetime.utcnow(),
                )
            ]
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get pair positions", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def close_pair_trade(self, trade_id: str) -> bool:
        """
        Close a pair trade.

        TODO: Implement actual API call.

        Args:
            trade_id: The trade ID to close

        Returns:
            True if closure was successful
        """
        logger.info("Closing pair trade", trade_id=trade_id)

        try:
            # TODO: Implement actual API call
            # await self._request("DELETE", f"/v1/pairs/trades/{trade_id}")
            return True
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to close pair trade", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    # ========================================================================
    # Bucket Trading
    # ========================================================================

    async def create_bucket_strategy(
        self, request: PearBucketStrategyRequest
    ) -> PearBucketStrategyResponse:
        """
        Create a new bucket trading strategy.

        TODO: Implement actual API call.

        Args:
            request: Bucket strategy configuration

        Returns:
            Strategy response with strategy ID and status
        """
        logger.info(
            "Creating bucket strategy",
            name=request.name,
            assets_count=len(request.assets),
            size=request.total_size,
        )

        try:
            # TODO: Implement actual API call
            # response = await self._request(
            #     "POST",
            #     "/v1/buckets/strategies",
            #     data=request.model_dump(),
            # )

            # Stub response
            return PearBucketStrategyResponse(
                strategy_id="pear_bucket_456",
                name=request.name,
                assets=request.assets,
                total_size=request.total_size,
                status="active",
                created_at=datetime.utcnow(),
            )
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to create bucket strategy", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def get_bucket_status(
        self, strategy_id: str
    ) -> PearBucketStatusResponse:
        """
        Get the status of a bucket strategy.

        TODO: Implement actual API call.

        Args:
            strategy_id: The strategy ID to check

        Returns:
            Current strategy status and holdings
        """
        logger.info("Getting bucket status", strategy_id=strategy_id)

        try:
            # TODO: Implement actual API call
            # response = await self._request(
            #     "GET",
            #     f"/v1/buckets/strategies/{strategy_id}",
            # )

            # Stub response
            return PearBucketStatusResponse(
                strategy_id=strategy_id,
                name="Tech Leaders Basket",
                assets=[
                    {"symbol": "ETH", "weight": 0.4, "current_value": 400.00},
                    {"symbol": "BTC", "weight": 0.3, "current_value": 310.00},
                    {"symbol": "SOL", "weight": 0.3, "current_value": 295.00},
                ],
                total_value=1005.00,
                unrealized_pnl=5.00,
                status="active",
                last_rebalance=datetime.utcnow(),
                created_at=datetime.utcnow(),
            )
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get bucket status", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def get_bucket_strategies(self) -> list[PearBucketStatusResponse]:
        """
        Get all bucket strategies.

        TODO: Implement actual API call.

        Returns:
            List of all bucket strategies with status
        """
        logger.info("Getting all bucket strategies")

        try:
            # TODO: Implement actual API call
            # response = await self._request("GET", "/v1/buckets/strategies")

            # Stub response - return empty list for now
            return []
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get bucket strategies", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    # ========================================================================
    # Instruments
    # ========================================================================

    async def get_instruments(self) -> list[Instrument]:
        """
        Get list of tradable instruments from Pear Protocol.

        TODO: Implement actual API call with caching.

        Returns:
            List of available trading instruments
        """
        logger.info("Getting Pear instruments")

        try:
            # TODO: Implement actual API call
            # response = await self._request("GET", "/v1/instruments")

            # Stub response
            return [
                Instrument(
                    symbol="ETH/BTC",
                    name="Ethereum / Bitcoin Pair",
                    base_currency="ETH",
                    quote_currency="BTC",
                    min_order_size=100.0,
                    price_decimals=6,
                    size_decimals=2,
                    source="pear",
                ),
                Instrument(
                    symbol="SOL/ETH",
                    name="Solana / Ethereum Pair",
                    base_currency="SOL",
                    quote_currency="ETH",
                    min_order_size=50.0,
                    price_decimals=6,
                    size_decimals=2,
                    source="pear",
                ),
            ]
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get instruments", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))


@lru_cache
def get_pear_service() -> PearService:
    """Get cached Pear service instance."""
    return PearService()
